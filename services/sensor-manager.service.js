import RandomSampleGenerator from "./random-sample-generator.service.js";
import Api from './api.service.js';
import Modal from '../partials/modal/modal.partial.js';
import ProbeRequest from '../models/probe-request.class.js';
import Office from '../core/office.class.js';
import Sensor from '../core/sensor.class.js';

export default class SensorManager {
    /**
     * @type {boolean} Indicates if the example signals should be used instead of the actual signals.
     */
    static TESTING_ONLY_EXAMPLE_SIGNALS = true;

    /**
     * @type {boolean} Indicates if random signals should be used instead of actual signals.
     */
    static TESTING_ONLY_RANDOMIZE_SIGNALS = false;

    /**
     * @type {Office} The selected office.
     */
    static selectedOffice = null;

    /**
     * @private
     * @param {Array<string>} sensors An array of the Access Point MAC addresses.
     * @param {Date} timeStart 
     * @param {Date} timeEnd 
     * @returns {Promise<Array<ProbeRequest>>} A promise representing the fetched probe requests.
     */
    static async getActualProbes(sensors, timeStart, timeEnd, reportingServer) {
        return await new Api().GetProbes(
            SensorManager.selectedOffice.Network,
            timeStart.getTime() / 1000,
            timeEnd.getTime() / 1000,
            sensors,
            reportingServer
        );
    }

    /**
     * @param {number} network The network id. {@link Office#Network}
     * @param {Array<Sensor>} sensors An array of the sensors.
     * @param {Date} date The date to start scanning from.
     * @returns {Promise<object>} A promise representing the results.
     */
    static async scanProbes(network, sensors, date, days = 3) {
        const sensorMacs = sensors.map(sensor => sensor.mac);
        const HOUR_IN_SECONDS = 3600;  // 60 * 60
        const MINUTES_5_IN_SECONDS = 300;  // 5 * 60
        const TOTAL_HOURS = days * 24;  // 3 days * 24 hours
        const progressBar = document.getElementById('progressBar');
        const $progressBarContainer = $("#progressBarContainer");

        $progressBarContainer.show();

        let results = {};

        let currentTime = Math.floor(date.getTime() / 1000);

        for (let hour = 0; hour < TOTAL_HOURS; hour++) {
            let seenMacsThisHour = new Set();

            const time_end = new Date((currentTime - (hour * HOUR_IN_SECONDS)) * 1000);
            const time_start = new Date(time_end.getTime() - MINUTES_5_IN_SECONDS * 1000);

            let probes = [];

            if (SensorManager.TESTING_ONLY_EXAMPLE_SIGNALS)
                probes = SensorManager.getExampleProbes(sensors, time_start, time_end);
            else
                probes = await SensorManager.getActualProbes(sensorMacs, time_start, time_end, network);

            probes.forEach(probe => seenMacsThisHour.add(probe.mac));

            // Update the progress bar
            let progress = (hour / (TOTAL_HOURS - 2)) * 100;
            progressBar.value = progress;

            seenMacsThisHour.forEach(mac => {
                if (!results[mac]) {
                    results[mac] = Array(TOTAL_HOURS).fill(false);
                }
                results[mac][hour] = true;
            });
        }
        $progressBarContainer.hide();

        Modal.displayResultsInTable(results, TOTAL_HOURS);

        return results;
    };

    /**
     * @private
     * @param {Array<Sensor>} sensors An array of the sensors.
     * @param {Date} timeStart 
     * @param {Date} timeEnd 
     * @returns {Array<ProbeRequest>} The example probe requests.
     */
    static getExampleProbes(sensors, timeStart, timeEnd) {
        const generator = new RandomSampleGenerator();
        const probes = [];

        [{ mac: '34:56:fe:12:34:56', location: { "x": 653, "y": 578 } },
        { mac: '43:56:fe:12:34:65', location: { "x": 890, "y": 427 } }].forEach(expected => {
            sensors.forEach(sensor => {
                for (let i = 0; i < 10; i++) {
                    const actualDistance = sensor.GetActualDistance(expected.location);
                    const signal = generator.NormalDistribution(actualDistance + 40, 15) * -1;
                    const probe = new ProbeRequest();
                    probe.mac = sensor.mac;
                    probe.avg_signal = signal;
                    probe.max_signal = signal;
                    probe.min_signal = signal;
                    probe.access_points_id = sensor.access_points_id;
                    probe.first_seen = timeStart.getTime() / 1000;
                    probe.last_seen = timeEnd.getTime() / 1000;
                    probe.mac = expected.mac;
                    probes.push(probe);
                }
            });
        });

        return probes;
    }

    static clearSignals(sensors) {
        sensors.forEach(sensor => {
            if (sensor.readings) sensor.readings.length = 0;
        });
    }

    /**
     * 
     * @param {Sensor[]} sensors 
     * @param {Date} timeStart 
     * @param {Date} timeEnd 
     */
    static async addSignal(sensors, timeStart, timeEnd, reportingServer) {
        if (!sensors || sensors.length === 0) return;

        let probes = [];

        if (SensorManager.TESTING_ONLY_EXAMPLE_SIGNALS)
            probes = SensorManager.getExampleProbes(sensors, timeStart, timeEnd);
        else
            probes = await SensorManager.getActualProbes(sensors.map(sensor => sensor.mac), timeStart, timeEnd, reportingServer);

        sensors.forEach((sensor, index) => {
            const result = probes.filter(r => r.access_points_id === sensor.access_points_id);

            if (SensorManager.TESTING_ONLY_RANDOMIZE_SIGNALS) {
                result.forEach(entry => {
                    const rand1 = Math.floor(Math.random() * -60) - 20;
                    const rand2 = Math.floor(Math.random() * -60) - 20;
                    const max = Math.max(rand1, rand2);
                    const min = Math.min(rand1, rand2);
                    const avg = Math.floor(Math.random() * (max - min)) + min;

                    entry.avg_signal = avg;
                    entry.max_signal = max;
                    entry.min_signal = min;
                });
            }

            sensor.setReadings(result);
        });
    }
}