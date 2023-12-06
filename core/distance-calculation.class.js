import DistanceGuess from "../models/distance-guess.class.js";
import Person from '../core/person.class.js';
import Zone from '../core/zone.class.js';
import Color from "../models/color.class.js";
import Pixel from "../models/pixel.class.js";
import DiscreteProbabilityMath from "../services/discrete-probability-math.service.js";
import Sensor from "./sensor.class.js";
import LocationGuess from "../models/location-guess.class.js";
import Konva from "Konva";
import { SelectedOffice } from "../main.js";

export default class DistanceCalculation
{
    // TODO: Figure out when these values should be reset. For instance, after any sensor is moved.
    static distanceSums = null;
    static minSum = Number.MAX_VALUE;
    static maxSum = Number.MIN_VALUE;

    /**
     * 
     * @param {Konva.Stage} stage 
     */
    constructor(stage)
    {
        this.stage = stage;
        this.guesses = [];
        this.processed = {};
    }

    /**
     * This is a helper method that tries to guess a person's position by analyzing the superimposed heatmaps of their radial distance from several sensors.
     * 
     * @param {Konva.Layer} layer A Konva layer containing the superimposed heatmaps.
     * @param {Array<Zone>} zones An array of zones, which might are specific areas of interest on the map.
     * @returns {LocationGuess} A LocationGuess object, which includes the x and y coordinates of the person's position, the area of the person's position, and whether the person is within a zone.
     */
    static GuessPersonPosition(layer, zones)
    {
        const darkest = DistanceCalculation._getDarkestPixel(layer);
        return new LocationGuess(darkest.x, darkest.y, 1, zones.some(zone => zone.ContainsPosition(darkest.x, darkest.y)));
    }

    /**
     * This method retrieves the darkest pixel on a Konva layer, which is considered as the most likely position of the person.
     * 
     * @param {Konva.Layer} layer A Konva layer containing the superimposed heatmaps.
     * @returns {Pixel} The darkest pixel, which includes its position (x and y coordinates) and color.
     */
    static _getDarkestPixel(layer)
    {
        const { width, height } = layer.getCanvas();
        const imgData = layer.getCanvas().getContext().getImageData(0, 0, width, height).data;

        let [darkestX, darkestY, darkestSum] = [0, 0, 0];

        for (let y = 1; y < height - 1; y++)
        {
            for (let x = 1; x < width - 1; x++)
            {
                const sum = [-1, 0, 1].reduce((a, dy) => a + [-1, 0, 1].reduce((b, dx) => b + DistanceCalculation.getAlpha(imgData, x + dx, y + dy, width), 0), 0);

                if (sum > darkestSum) [darkestX, darkestY, darkestSum] = [x, y, sum];
            }
        }

        const idx = (darkestY * width + darkestX) * 4;
        return new Pixel(darkestX, darkestY, new Color(imgData[idx], imgData[idx + 1], imgData[idx + 2], imgData[idx + 3]));
    }

    /**
     * Adjust the opacity of each pixel based on the proximity to all sensors.
     *
     * @param {Konva.Layer} layer The layer where the heatmap resides.
     * @param {Sensor[]} sensors An array of sensors.
     */
    static AdjustOpacityByProximity(layer, sensors)
    {
        return;
        /**
         * @description The ratio of the alpha value that should be affected. 
         * Higher values will give more weight to this adjustment.
         * @type {number}
         */
        const influence = 0.20;

        const { width, height } = layer.getCanvas();
        const imgData = layer.getCanvas().getContext().getImageData(0, 0, width, height);

        // First pass: Calculate the sum of distances for each pixel from all sensors
        if (DistanceCalculation.distanceSums === null)
        {
            DistanceCalculation.distanceSums = [];

            for (let y = 0; y < height; y++)
            {
                for (let x = 0; x < width; x++)
                {
                    let sum = 0;
                    for (const sensor of sensors)
                    {
                        sum += Math.sqrt(Math.pow(sensor.x() - x, 2) + Math.pow(sensor.y() - y, 2));
                    }
                    DistanceCalculation.distanceSums.push(sum);
                    if (sum < DistanceCalculation.minSum) DistanceCalculation.minSum = sum;
                    if (sum > DistanceCalculation.maxSum) DistanceCalculation.maxSum = sum;
                }
            }
        }

        // Second pass: Adjust the opacity using the sum of distances
        for (let y = 0; y < height; y++)
        {
            for (let x = 0; x < width; x++)
            {
                const idx = (y * width + x) * 4;
                const alpha = imgData.data[idx + 3];
                const sum = DistanceCalculation.distanceSums[y * width + x];
                const ratio = (sum - DistanceCalculation.minSum) / (DistanceCalculation.maxSum - DistanceCalculation.minSum);
                imgData.data[idx + 3] = alpha * (1 - influence) + alpha * ratio * influence; // Adjust the opacity based on the ratio
            }
        }
        layer.destroyChildren();
        layer.draw();
        layer.getCanvas().getContext().putImageData(imgData, 0, 0);

    }

    // Utility function to get alpha value for a given x,y position
    static getAlpha(data, x, y, width)
    {
        return data[(y * width + x) * 4 + 3];
    }

    /**
     * 
     * @param {Sensor[]} sensors 
     * @param {Person[]} people 
     * @param {number} time The time value in milliseconds since midnight, January 1, 1970 UTC.
     * @param {boolean} manualTuning
     * @param {boolean} dropWorst If true, the worst distance guesses will be dropped from the calculation.
     */
    static tuneXa = (sensors, people, time, manualTuning = false, dropWorst = false) =>
        sensors.forEach(sensor => DistanceCalculation.tuneXaOnSensor(sensor, people, time, manualTuning, dropWorst));

    /**
     * Sets the Xa value on the given sensor to the value that minimizes the error between the actual distance and the calculated distance.
     * 
     * Note: The standard deviation of Xα is in the range of 3 dB up to 20 dB
     * 
     * @param {Sensor} sensor 
     * @param {Person[]} people 
     * @param {number} time The time value in milliseconds since midnight, January 1, 1970 UTC.
     * @param {boolean} manualTuning
     * @param {boolean} dropWorst If true, the worst distance guesses will be dropped from the calculation.
     */
    static tuneXaOnSensor(sensor, people, time, manualTuning = false, dropWorst = false)
    {
        const visiblePeople = people.filter(p => !p.IsHidden() && (manualTuning ? p.CalibrationIsSet : p.HasExpected(time)) && sensor.HasReadingsForMac(p.getMac()));
        if (!visiblePeople.length) return;

        const xaRange = 100;
        const xaStep = 0.05;

        sensor.Xa = DistanceCalculation._scanXa((guess, actual) => Math.abs(guess - actual), sensor, visiblePeople, time, xaRange, xaStep, manualTuning);
        // sensor.Xa = DistanceCalculation._scanXa((guess, actual) => Math.sqrt(Math.abs(guess - actual)), sensor, visiblePeople, time, xaRange, xaStep, manualTuning);
        // sensor.Xa = DistanceCalculation._scanXa((guess, actual) => Math.pow(Math.abs(guess - actual), 2), sensor, visiblePeople, time, xaRange, xaStep, manualTuning);

        if (!dropWorst || visiblePeople.length < 2) return;

        // Recalcutate distances to get the average distance error for the sensor.
        const avgError = visiblePeople.reduce((totalError, person) =>
            totalError + DistanceCalculation._scanXa_doStep((guess, actual) => Math.abs(guess - actual), totalError, sensor, person, time, manualTuning), 0) / visiblePeople.length;

        // Filter the array of people based on the average distance error.
        const filteredPeople = visiblePeople.filter(p =>
        {
            const actual = manualTuning ? sensor.GetActualDistance(p.getCalibration()) : sensor.GetDistanceToExpected(p, time);
            const guess = DistanceCalculation.CalculateDistance(sensor, p.getMac());
            return guess && Math.abs(guess.distance - actual) < avgError * 2;
        });

        sensor.Xa = DistanceCalculation._scanXa((guess, actual) => Math.abs(guess - actual), sensor, filteredPeople, time, xaRange, xaStep, manualTuning);
    }

    /**
     * @private
     * @param {function} callbackfn
     * @param {Sensor} sensor 
     * @param {Person[]} people 
     * @param {number} time 
     * @param {number} xaRange 
     * @param {number} xaStep 
     * @param {boolean} manualTuning 
     * @returns {number} The Xa value that minimizes the error between the actual distance and the calculated distance.
     */
    static _scanXa(callbackfn, sensor, people, time, xaRange, xaStep, manualTuning = false)
    {
        const xaScan = [...Array(Math.floor(2 * xaRange / xaStep))].map((_, i) => ({
            xa: -xaRange + xaStep * i,
            error: people.reduce((err, person) =>
            {
                sensor.Xa = -xaRange + xaStep * i;
                return DistanceCalculation._scanXa_doStep(callbackfn, err, sensor, person, time, manualTuning);
            }, 0)
        }));

        return xaScan.reduce((min, cur) => cur.error < min.error ? cur : min).xa;
    }

    /**
     * 
     * @param {function} callbackfn
     * @param {number} totalError 
     * @param {Sensor} sensor 
     * @param {Person} person 
     * @param {number} time 
     * @param {boolean} manualTuning 
     * @returns {number} The total error between the actual distance and the calculated distance.
     */
    static _scanXa_doStep(callbackfn, totalError, sensor, person, time, manualTuning)
    {
        const actual = manualTuning ? sensor.GetActualDistance(person.getCalibration()) : sensor.GetDistanceToExpected(person, time);
        const guess = DistanceCalculation.CalculateDistance(sensor, person.getMac());
        return guess ? totalError + callbackfn(guess.distance, actual) : totalError;
    }

    /**
     * Returns a Konva.Circle representing the distance guess.
     * 
     * The GetHeatmap function in the following class produces a gradient circle representing the probability that a device is at a distance from a sensor, 
     * where higher opacity represents a greater probability that the device is at that distance. 
     * The distance guess is one-dimensional, hence it is displayed in two dimensions as a radius around the sensor. 
     * 
     * There are several sensors detecting the device, so the GetHeatmap function is for every sensor and all circles are drawn onto a canvas to create a 
     * heatmap representing the probability of the device's two-dimensional location, where overlapping circles produce higher opacities, implementing a 
     * trilateration algorithm.
     * 
     * @param {?DistanceGuess} guess 
     * @param {number} x 
     * @param {number} y 
     * @param {string} mac 
     * @returns {?Konva.Circle} A Konva.Circle representing the distance guess.
     */
    static GetHeatmap(guess, x, y, mac)
    {
        if (guess === null) return null;

        /**
         * @description The maximum opacity of the guess. 
         * Higher values will give more weight to individual guesses; lower values will give more weight to overlapping guesses.
         * @type {number}
         */
        const maxOpacity = 0.65;

        // Mitigate the affect of the guess if the sensor is distant.
        const x0 = 3.048; // Adjust x0 to the desired distance where guessStrength = 1
        const x1 = 30.48 * 0.5; // Adjust x1 to the desired distance where guessStrength = 0.5
        let guessStrength = Math.min(1, +Math.exp(Math.log(0.5) / x1 * (guess.distance - x0))).toFixed(4);

        // Mitigate the affect of the guess if the sensor collected a low number of signals.
        // guessStrength *= Math.min(1, guess.signalCount / 4);

        // Mitigate the affect of the guess if the sensor's signals were not consistent.
        guessStrength *= Math.min(1, 1 / (guess.stddev + 1));

        // Mitigate the affect of low power signals.
        const y0 = 60; // Adjust x0 to the desired signal where guessStrength = 1
        const y1 = 90; // Adjust x1 to the desired signal where guessStrength = 0.5
        guessStrength *= Math.min(1, +Math.exp(Math.log(0.5) / y1 * (Math.abs(guess.averageSignalStrength) - y0))).toFixed(2);

        // Don't trust very strong signals.
        // guessStrength *= guess.averageSignalStrength < 7 ? 0.5 : 1;

        // Lower values will give more weight to the area directly around the guess; Higher values will distribute the weight more evenly.
        const stdevOpacity = 0.90;

        const color = new Color().SetRgbFromMac(mac);
        color.a = maxOpacity;

        const fill = color.AsStyle(guessStrength);
        const fill2 = color.AsStyle(guessStrength * stdevOpacity);
        const fill3 = color.AsStyle(0);

        /**
         * @description The Konva Circle is drawn with a radial gradient fill that extends beyond the distance guess, so
         * that the color stops can be used to represent the uncertainty of the guess.
         */
        const radiusMultiplier = 4;

        const radius = guess.distance * SelectedOffice.MetersToPixels;
        const radiusOuter = (guess.distance + Math.min(guess.distance, Math.max(0.1, guess.stddev))) * SelectedOffice.MetersToPixels;
        const radiusInner = (guess.distance - Math.min(guess.distance, Math.max(0.1, guess.stddev))) * SelectedOffice.MetersToPixels;

        return new Konva.Circle({
            x: x,
            y: y,
            radius: radius * radiusMultiplier,
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndRadius: radius * radiusMultiplier,
            fillRadialGradientColorStops: [
                0, fill3,
                (radiusInner / radius) / radiusMultiplier, fill2,
                1 / radiusMultiplier, fill,
                (radiusOuter / radius) / radiusMultiplier, fill2,
                1, fill3
            ],
            opacity: color.a,
            listening: false,
            mac: mac
        });
    }

    /**
     * 
     * @param {Sensor} sensor The sensor that received the signal.
     * @param {string} mac The MAC address of the device that sent the signal.
     * @returns {?DistanceGuess} guess The distance guess.
     */
    static CalculateDistance(sensor, mac)
    {
        let Ptx = sensor.Ptx;
        let Gtx = sensor.Gtx;
        let Grx = sensor.Grx;
        let Xa = sensor.Xa;
        let l = sensor.l;

        let guesses = [];

        // Prx (dBm) is the power level measured at the receiver
        // Note: Our receiver has already converted the "RSSI" reading into dBm.

        let readings = sensor.GetReadingsByMac(mac);

        if (readings.length === 0) return null;

        for (let i in readings)
            guesses.push(DiscreteProbabilityMath.tunedHataOkumara(
                Ptx,
                readings[i],
                Gtx,
                Grx,
                Xa,
                l,
                sensor.GetInterferenceCoefficient(readings[i])));

        return new DistanceGuess(
            DiscreteProbabilityMath.Average(guesses),
            DiscreteProbabilityMath.StandardDeviation(guesses),
            DiscreteProbabilityMath.Average(readings),
            readings.length
        );
    }
}