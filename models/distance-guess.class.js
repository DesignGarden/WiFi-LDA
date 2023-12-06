export default class DistanceGuess
{
    /**
     * @constructor
     * @param {number} distance 
     * @param {number} standardDeviation 
     * @param {number} averageSignalStrength 
     * @param {number} signalCount 
     */
    constructor(distance, standardDeviation, averageSignalStrength, signalCount)
    {
        /**
         * type {number} The distance in meters.
         */
        this.distance = distance;

        /**
         * type {number} The standard deviation of the distance in meters.
         */
        this.stddev = standardDeviation;

        /**
         * type {number} The average signal strength in dBm.
         */
        this.averageSignalStrength = averageSignalStrength;

        /**
         * type {number} The number of signals used to calculate the distance.
         */
        this.signalCount = signalCount;
    }
}