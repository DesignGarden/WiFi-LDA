import RandomSampleGenerator from "./random-sample-generator.service.js";
import Api from './api.service.js';
import Modal from '../partials/modal/modal.partial.js';

export default class SensorManager
{
    static TESTING_ONLY_RANDOMIZE_SIGNALS = false;
    static selectedOffice = null;

    constructor()
    {
        this.sampleGenerator = new RandomSampleGenerator();
    }

    /**
     * @private
     * @param {*} sensors 
     * @param {*} timeStart 
     * @param {*} timeEnd 
     * @returns 
     */
    static async getActualSignal(sensors, timeStart, timeEnd, reportingServer)
    {
        return await new Api().GetProbes(
            SensorManager.selectedOffice.Network,
            timeStart.getTime() / 1000,
            timeEnd.getTime() / 1000,
            sensors,
            reportingServer
        );
    }

    static async scanProbes(network, sensors, date, days = 3)
    {
        const sensorMacs = sensors.map(sensor => sensor.mac);
        const HOUR_IN_SECONDS = 3600;  // 60 * 60
        const MINUTES_5_IN_SECONDS = 300;  // 5 * 60
        const TOTAL_HOURS = days * 24;  // 3 days * 24 hours
        const progressBar = document.getElementById('progressBar');
        const $progressBarContainer = $("#progressBarContainer");

        $progressBarContainer.show();

        let results = {};

        let currentTime = Math.floor(date.getTime() / 1000);

        for (let hour = 0; hour < TOTAL_HOURS; hour++)
        {
            let seenMacsThisHour = new Set();

            const time_end = currentTime - (hour * HOUR_IN_SECONDS);
            const time_start = time_end - MINUTES_5_IN_SECONDS;

            const probes = await new Api().GetProbes(network, time_start, time_end, sensorMacs);

            probes.forEach(probe => seenMacsThisHour.add(probe.mac));

            // Update the progress bar
            let progress = (hour / (TOTAL_HOURS - 2)) * 100;
            progressBar.value = progress;

            seenMacsThisHour.forEach(mac =>
            {
                if (!results[mac])
                {
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
     * @param {*} person 
     * @param {*} sensor 
     * @returns 
     */
    getExampleSignal(person, sensor)
    {
        const actualDistance = sensor.GetActualDistance(person.getNode());
        const signal = this.sampleGenerator.NormalDistribution(actualDistance + 40, 45) * -1;
        return signal;
    }

    static clearSignals(sensors)
    {
        sensors.forEach(sensor =>
        {
            if (sensor.readings) sensor.readings.length = 0;
        });
    }

    /**
     * 
     * @param {Sensor[]} sensors 
     * @param {Date} timeStart 
     * @param {Date} timeEnd 
     */
    static async addSignal(sensors, timeStart, timeEnd, reportingServer)
    {
        if (!sensors || sensors.length === 0) return;

        // TODO: Can I get rid of this sensorMacs array?
        const sensorMacs = sensors.map(sensor => sensor.mac);
        const data = await SensorManager.getActualSignal(sensorMacs, timeStart, timeEnd, reportingServer);

        sensors.forEach((sensor, index) =>
        {
            const result = data.filter(r => r.access_points_id === sensor.access_points_id);

            if (SensorManager.TESTING_ONLY_RANDOMIZE_SIGNALS)
            {
                result.forEach(entry =>
                {
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