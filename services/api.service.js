import { ReportingServer as GlobalReportingServer } from '../main.js';
import ProbeRequest from '../models/probe-request.class.js';

export default class Api
{
    /**
     * Creates a new instance of the API class.
     * @param {Function} [reportingServer=GlobalReportingServer] - The reporting server function. Defaults to the global reporting server.
     */
    constructor(reportingServer = GlobalReportingServer)
    {
        this.signature = '';
        this.reportingServer = reportingServer();
    }

    /**
     * Posts Bacnet data to a specified endpoint.
     * @param {object} zones - The data representing zones to post.
     * @returns {Promise} - A promise representing the completion of the HTTP post request.
     */
    async PostBacnetData(zones)
    {
        return $.post({
            url: '/bacnet/headcount/',
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(zones)

        });
    }

    /**
     * Fetches a sensor ID based on the provided network and mac address.
     * @param {string} network - The network identifier.
     * @param {string} mac - The MAC address.
     * @returns {Promise} - A promise representing the fetched data or the ID and details of the device.
     */
    async GetSensorId(network, mac)
    {
        const devices = await this._getMerakiDevices(); // TODO: Replace this hacky code.
        const device = devices.find(d => d.ap_mac.toLowerCase() === mac.toLowerCase());

        if (device)
        {
            return [{
                "id": device.id,
                "networks_id": -1,
                "node_mac": mac.toUpperCase(),
                "version": "1"
            }];
        }

        return $.ajax({
            url: `${this.reportingServer}/access_points/info?sensor_macs[]=${mac}`,
            headers: {
                'signature': this.signature,
                'Content-Type': 'application/json'
            },
            data: {
                "sensor_macs[]": mac,
                network
            },
            method: 'GET',
        });
    }

    /**
     * 
     * @param {number} network The network id of the Access Points.
     * @param {number} time_start The start time in seconds.
     * @param {number} time_end The end time in seconds.
     * @param {Array<string>} sensors An array of the Access Point MAC addresses.
     * @returns {Promise<Array<ProbeRequest>>} A promise representing the fetched probe requests.
     */
    async GetProbes(network, time_start, time_end, sensors)
    {
        const macs = sensors.map(sensor => `sensor_macs[]=${sensor}`).join('&');
        const route = '/presence_reports/device/probes';
        return $.get({
            url: `${this.reportingServer}${route}?network=${network}&time_start=${time_start}&time_end=${time_end}&${macs}`,
            headers: {
                'signature': this.signature,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Fetches Meraki devices from the reporting server.
     * @private
     * @returns {Promise} - A promise representing the fetched Meraki devices.
     */
    async _getMerakiDevices()
    {
        return $.get({
            url: `${this.reportingServer}/meraki_access_points/info`,
            headers: {
                'signature': this.signature,
                'Content-Type': 'application/json'
            }
        });
    }
}