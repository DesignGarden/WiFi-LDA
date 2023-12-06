import Dashboard from "./ui/dashboard.class.js";
import FileSystem from './services/file-system.service.js';
import SensorManager from "./services/sensor-manager.service.js";
import Zone from "./core/zone.class.js";
import Office from "./core/office.class.js";
import Sensor from "./core/sensor.class.js";
import Modal from "./partials/modal/modal.partial.js";
import Gui from "./ui/gui.class.js";
import DistanceCalculation from "./core/distance-calculation.class.js";
import DistanceGuess from "./models/distance-guess.class.js";
import Konva from "Konva";

Konva.autoDrawEnabled = false;

export const SelectedOffice = new Office();
const NumberOfLayers = 1;

SensorManager.selectedOffice = SelectedOffice;
const dashboard = new Dashboard(SelectedOffice, NumberOfLayers);

export const ReportingServer = () => dashboard.reportingServer;

/**
 * 
 * @param {Gui} gui 
 */
const addButtonsToGui = async (gui) =>
{
    /**
     * 
     * @param {Array} buttons 
     * @returns 
     */
    const addGroupWithButtons = (buttons) => gui.AddVerticalGroup(...buttons.map(btn => gui.addButton(...btn)));

    addGroupWithButtons([
        ["Add Sensor", () =>
        {
            SensorManager.clearSignals(dashboard.sensors);
            const s = new Sensor(dashboard.layer, dashboard.sensorVisualizationLayer, '', dashboard, dashboard.reportingServer);
            dashboard.sensors.push(s);
            dashboard.layer.draw();
        }],
        ["Add Zone", () =>
        {
            const zone = new Zone(dashboard.zoneLayer, dashboard.x, dashboard.y - 150, SelectedOffice.MetersToPixels);
            dashboard.zones.push(zone);
            dashboard.zoneLayer.draw();
        }]
    ]);

    addGroupWithButtons([
        ["Get Signals (5m)", () => dashboard.getSignalsAndDrawGuesses(5)],
        ["Get Signals (15m)", () => dashboard.getSignalsAndDrawGuesses(15)],
        ["Get Signals (30m)", () => dashboard.getSignalsAndDrawGuesses(30)],
        ["Get Signals (1h)", () => dashboard.getSignalsAndDrawGuesses(60)],
        ["Get Signals (2h)", () => dashboard.getSignalsAndDrawGuesses(60 * 2)],
        ["Get Signals (12h)", () => dashboard.getSignalsAndDrawGuesses(60 * 12)]
    ]);

    addGroupWithButtons([
        ["Exclude", () =>
        {
            const time = dashboard.slider.GetTime().getTime();
            const excluded = dashboard.people
                .filter(p => !p.IsKnownDevice() && p.GetGuess(time) !== null)
                .map(p =>
                {
                    p.IsHidden(true);
                    return p.getMac();
                });
            console.info(excluded);
        }],
        ["Scan Devices", async () => await SensorManager.scanProbes(SensorManager.selectedOffice.Network, dashboard.sensors, dashboard.slider.GetTime(), 7)]
    ]);

    addGroupWithButtons([
        ["Scan Day", () => dashboard.scanDuration(24)],
        ["Scan 8H", () => dashboard.scanDuration(8)],
        ["Scan 2H", () => dashboard.scanDuration(2, 120)],
        ["Headcount", () => dashboard.headcountScan(1, 15)]
    ]);

    let BacnetContinousIsRunning = false;
    addGroupWithButtons([
        ["BACNET Single", () => dashboard.runBacnet()],
        ["BACNET Continuous", async (button) =>
        {
            BacnetContinousIsRunning = !BacnetContinousIsRunning;
            button.text(`BACNET Continuous${BacnetContinousIsRunning ? " (click again to stop) " : ""}`);
            dashboard.uiLayer.draw();
            while (BacnetContinousIsRunning)
            {
                await dashboard.runBacnet();
                await new Promise(r => setTimeout(r, 5000));
            }
        }]
    ]);

    addGroupWithButtons([
        ["Tune Xa (auto)", async () => await dashboard.tuneAndDraw()],
        ["Tune Xa (auto, exclusive)", async () => await dashboard.tuneAndDraw(false, true)],
        ["Tune Xa (manual)", async () => await dashboard.tuneAndDraw(true)],
        ["Clear Xa, -15", async () => await dashboard.clearXa(-15)],
        ["Clear Xa, -5", async () => await dashboard.clearXa(-5)],
        ["Clear Xa, 5", async () => await dashboard.clearXa(5)],
        ["Clear Xa, 15", async () => await dashboard.clearXa(15)],
        ["Show/Hide Paths", () => dashboard.togglePaths()]
    ]);

    addGroupWithButtons([
        ["Save", () => FileSystem.saveConfig(SelectedOffice, dashboard.sensors, dashboard.zones)],
        ["Load", () => FileSystem.loadConfig(SelectedOffice, dashboard.sensors, dashboard, dashboard.SaveIndex)],
        ["Load from JSON", () => FileSystem.loadConfigFromJson(dashboard.sensors, dashboard)],
        ["Export CSV", () => FileSystem.exportCsv(dashboard)]
    ]);
};

$(document).ready(async () =>
{
    await dashboard.BuildGui();
    await dashboard.AddButtons(addButtonsToGui);

    $('#toggle-gui').click(e => dashboard.ToggleUILayerVisibility());

    const modal = new Modal();
    modal.Init();

    //FileSystem.loadConfig(SelectedOffice, dashboard.sensors, dashboard, dashboard.SaveIndex)
    // await test();
    // test2();
});

function test2()
{
    dashboard.sensors.forEach(s =>
    {
        const distance = s.GetActualDistance({"x":852,"y":478.671875}) * 3.28084;

        console.log(s.getMac(), distance);
    });
}

async function test()
{
    FileSystem.loadConfig(SelectedOffice, dashboard.sensors, dashboard, dashboard.SaveIndex);

    const layer = dashboard.guessLayers[0];
    const { width, height } = layer.getCanvas();

    const redRectangle = new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: 'red'
    });

    await new Promise(r => setTimeout(r, 2000));

    // Add the rectangle to the layer
    layer.add(redRectangle);
    layer.draw();

    await new Promise(r => setTimeout(r, 1000));

    DistanceCalculation.AdjustOpacityByProximity(layer, dashboard.sensors);

    return;
    for (let i = 1; i < 30; i++)
    {
        // const sampleGuess = new DistanceGuess(i, 1, -70, 10);
        const sampleGuess = new DistanceGuess(10, 1, -10 * i, 10);

        _drawTest(sampleGuess);

        await new Promise(r => setTimeout(r, 1000));
    }
}

/**
 * 
 * @param {DistanceGuess} sampleGuess 
 */
function _drawTest(sampleGuess)
{
    const layer = dashboard.guessLayers[0];

    layer.destroyChildren();
    layer.clear();

    const x = 750; // center x of canvas
    const y = 500; // center y of canvas
    const mac = "00:00:00:FF:00:00";

    const heatmap = DistanceCalculation.GetHeatmap(sampleGuess, x, y, mac);
    layer.add(heatmap);

    layer.draw();
    const guess = DistanceCalculation.GuessPersonPosition(layer, []);

    // Draw a circle on the canvas around the heatmap that represents the distance.
    const radius = new Konva.Circle({
        x: x,
        y: y,
        radius: sampleGuess.distance * SelectedOffice.MetersToPixels,
        stroke: 'black',
        strokeWidth: 1
    });
    layer.add(radius);

    // Draw the guess as a circle on the canvas.
    const circle = new Konva.Circle({
        x: guess.x,
        y: guess.y,
        radius: 5,
        fill: 'red',
        stroke: 'black',
        strokeWidth: 1
    });
    layer.add(circle);
    layer.draw();
}