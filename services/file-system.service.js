import SensorManager from './sensor-manager.service.js';
import Sensor from '../core/sensor.class.js';
import GeoTransform from './geo-transform.service.js';
import Zone from '../core/zone.class.js';

export default class FileSystem
{

    static saveConfig(office, sensors, zones)
    {
        console.info(JSON.stringify({
            sensors: sensors.map(sensor => sensor.Save()),
            zones: zones.map(zone => zone.Save()),
            IgnoreMacs: office.IgnoreMacs
        }));
    }

    static loadConfig(selectedOffice, sensors, dashboard, SaveIndex)
    {
        const content = selectedOffice?.Saves[SaveIndex];
        content && FileSystem._loadCommonConfig(content, sensors, dashboard);
    }

    static loadConfigFromJson(sensors, dashboard)
    {
        const json = $('input#json').val();
        if (!json) return;
        FileSystem._loadCommonConfig(JSON.parse(json), sensors, dashboard);
    }

    /**
     * @private
     */
    static _loadCommonConfig(content, sensors, dashboard)
    {
        SensorManager.clearSignals(sensors);
        FileSystem.loadJson(content, dashboard);
        dashboard.zoneLayer.draw();
        dashboard.layer.draw();
        dashboard.uiLayer.draw();
    }

    static async exportCsv(dashboard)
    {
        const time = dashboard.slider.GetTime().getTime();

        if (!dashboard.scanTimes.includes(time) || !dashboard.sensors.length) return;

        const array = dashboard.sensors.flatMap(sensor => sensor.GetReadings().map(Object.values));
        FileSystem.DownloadCsv("Probe Requests", array);
    }

    /**
     * @private
     */
    static loadJson(content, dashboard)
    {
        dashboard.sensors.forEach(sensor => sensor.Delete());
        dashboard.zones.forEach(zone => zone.Delete());

        dashboard.sensors = content.sensors.map(sensorData =>
        {
            const s = new Sensor(dashboard.layer, dashboard.sensorVisualizationLayer, '', dashboard, dashboard.reportingServer);
            s.Load(sensorData);
            return s;
        });

        dashboard.zones = content.zones.map(zoneData =>
        {
            const z = new Zone(dashboard.zoneLayer, dashboard.x, dashboard.y - 150, dashboard.selectedOffice.MetersToPixels);
            z.Load(zoneData);
            return z;
        });

        const transform = dashboard.selectedOffice.GetGeoTransform();

        if (transform)
        {
            FileSystem._handleGeoZone(transform, dashboard);
        }

        dashboard.gridLayer.draw();

        dashboard.selectedOffice.IgnoreMacs = content.IgnoreMacs;
    }

    /**
     * @private
     */
    static _handleGeoZone(transform, dashboard)
    {
        const { tl, tr, br, bl } = transform.configured.geo;

        const transformedTl = GeoTransform.transformGeoToPixels(tl.lat, tl.lng, transform);
        const transformedTr = GeoTransform.transformGeoToPixels(tr.lat, tr.lng, transform);
        const transformedBr = GeoTransform.transformGeoToPixels(br.lat, br.lng, transform);
        const transformedBl = GeoTransform.transformGeoToPixels(bl.lat, bl.lng, transform);

        const { tl: actualTl, tr: actualTr, br: actualBr, bl: actualBl } = transform.actual.pixels;

        if (transformedTl && transformedBr)
        {
            const geoZone = new Zone(dashboard.zoneLayer, 0, 0, dashboard.selectedOffice.MetersToPixels);
            geoZone.SetupSimple(transformedTl, transformedTr, transformedBr, transformedBl);
            dashboard.zones.push(geoZone);

            const geoZoneExpected = new Zone(dashboard.zoneLayer, 0, 0, dashboard.selectedOffice.MetersToPixels);
            geoZoneExpected.SetupSimple(actualTl, actualTr, actualBr, actualBl);
            dashboard.zones.push(geoZoneExpected);
        }

        let demoGeomd = GeoTransform.transformGeoToPixels(32.753966586515155, -97.33110186104578, transform);
        dashboard.gui.addMarker(demoGeomd.x, demoGeomd.y, "md");
        dashboard.gui.addMarker(transformedTl.x, transformedTl.y, "tl");
        dashboard.gui.addMarker(transformedTr.x, transformedTr.y, "tr");
        dashboard.gui.addMarker(transformedBl.x, transformedBl.y, "bl");
        dashboard.gui.addMarker(transformedBr.x, transformedBr.y, "br");
    }

    static DownloadCsv(filename, array)
    {
        const csvContent = `data:text/csv;charset=utf-8,${array.map(e => e.join(",")).join("\n")}`;

        const link = $(`<a>`, {
            href: encodeURI(csvContent),
            download: `${filename}.csv`,
            text: `${filename}.csv`,
            css: {
                position: 'absolute',
                top: 0,
                right: 0
            }
        }).appendTo('body');

        link.click();
        // link.remove();
    }
}