import { SelectedOffice } from '../main.js'

export default class DiscreteProbabilityMath
{
    static Average = (array) => array.reduce((a, b) => a + b) / array.length;

    static StandardDeviation(array)
    {
        let i, j, total = 0, mean = 0, diffSqredArr = [];

        for (i = 0; i < array.length; i += 1)
        {
            total += array[i];
        }

        mean = total / array.length;

        for (j = 0; j < array.length; j += 1)
        {
            diffSqredArr.push(Math.pow((array[j] - mean), 2));
        }

        return Math.sqrt(DiscreteProbabilityMath.Average(diffSqredArr));
    };

    /**
     * From "A Practical Path Loss Model For Indoor WiFi Positioning Enhancement"
     * 
     * @param {number} Ptx the transmitted power level (TSSI) in dBm.
     * @param {number} Prx the power level measured at the receiver (RSSI) in dBm.
     * @param {number} Gtx the antennae gain of the transmitter in dBi.
     * @param {number} Grx the antennae gain of the receiver in dBi.
     * @param {number} Xa a normal random variable with a standard deviation of a.
     * @param {number} l the wavelength of the signal in meters.
     * @returns {number} the distance in meters.
     */
    static tunedHataOkumara(Ptx, Prx, Gtx, Grx, Xa, l, n)
    {
        return DiscreteProbabilityMath.hataOkumara(n, Ptx, Prx, Gtx, Grx, Xa, l);
    }

    /**
     * From "A Practical Path Loss Model For Indoor WiFi Positioning Enhancement"
     * 
     * @param {number} Ptx the transmitted power level (TSSI) in dBm.
     * @param {number} d the actual distance in meters.
     * @param {number} Gtx the antennae gain of the transmitter in dBi.
     * @param {number} Grx the antennae gain of the receiver in dBi.
     * @param {number} Xa a normal random variable with a standard deviation of a, Xα is in the range of 3 dB up to 20 dB.
     * @param {number} l the wavelength of the signal in meters.
     */
    static tunedHataOkumaraReversed(Ptx, d, Gtx, Grx, Xa, l, n)
    {
        return DiscreteProbabilityMath.hataOkumaraReversed(n, Ptx, d, Gtx, Grx, Xa, l);
    }

    /**
     * Calculates n for the Hata Okumara equation.
     * 
     * For free space, n equals 2, but for obstructed paths in buildings, 
     * n is between 4 and 5 giving a much smaller communication range for 
     * the same settings.
     * 
     * @param {number} Prx the transmitted power level (TSSI) in dBm.
     * @returns {number} The Path-based interference coefficient (n).
     */
    static GetInterferenceCoefficient(Prx)
    {
        let n = 0;

        if (Prx > -33) n = 8;
        else if (Prx > -36) n = 7;
        else if (Prx > -40) n = 6;
        else if (Prx > -49) n = 5;
        else if (Prx > -55) n = 4;
        else n = 3.5;

        let coeff = parseFloat($('#nFactor').val());

        n *= coeff;

        return n;
    }

    /**
     * 
     * @param {number} n a measure of the influence of obstacles like partitions, walls and doors.
     * @param {number} Ptx the transmitted power level (TSSI) in dBm.
     * @param {number} Prx the power level measured at the receiver (RSSI) in dBm.
     * @param {number} Gtx the antennae gain of the transmitter in dBi.
     * @param {number} Grx the antennae gain of the receiver in dBi.
     * @param {number} Xa a normal random variable with a standard deviation of a.
     * @param {number} l the wavelength of the signal in meters.
     * @returns {number} the distance in meters.
     */
    static hataOkumara(n, Ptx, Prx, Gtx, Grx, Xa, l)
    {
        const pathLoss = Ptx - Prx + Gtx + Grx;
        const exponent = (pathLoss - Xa + 20 * Math.log10(l) - 20 * Math.log10(4 * Math.PI)) / (10 * n);
        const ratio = Math.pow(10, exponent);
        const distance = 1 * ratio;
        return distance;
    }

    /**
     * 
     * @param {number} n the path loss exponent (a measure of the influence of obstacles like partitions, walls and doors).
     * @param {number} Ptx the transmitted power level (TSSI) in dBm.
     * @param {number} Prx the power level measured at the receiver (RSSI) in dBi.
     * @param {number} Gtx the antennae gain of the transmitter in dBi.
     * @param {number} Grx the antennae gain of the receiver in dBi.
     * @param {number} PL_d0 the path loss at reference distance in dB.
     * @param {number} d0 the reference distance in meters.
     * @returns {number} the distance in meters.
     */
    static LogDistancePathLossModelWithReference(n, Prx, Ptx, Gtx, Grx, PL_d0, d0)
    {
        const pathLoss = Ptx - Prx + Gtx + Grx;
        const exponent = (pathLoss - PL_d0) / (10 * n);
        const ratio = Math.pow(10, exponent);
        const distance = d0 * ratio;
        return distance;
    }

    /**
     * 
     * @param {number} n the path loss exponent (a measure of the influence of obstacles like partitions, walls and doors).
     * @param {number} Ptx the transmitted power level (TSSI) in dBm.
     * @param {number} Prx the power level measured at the receiver (RSSI) in dBi.
     * @param {number} A a constant representing the frequency of the signal, the antennas, etc.
     * @returns {number} the distance in meters.
     */
    static LogDistancePathLossModel(n, Ptx, Prx, A)
    {
        const pathLoss = Ptx - Prx;
        const exponent = (pathLoss - A) / (10 * n);
        const ratio = Math.pow(10, exponent);
        const distance = 1 * ratio;
        return distance;
    }

    /**
     * Calculate the distance from a source given the signal strength.
     *
     * @param {number} n - The power to which the distance ratio is raised, typically 2 for the inverse square law.
     * @param {number} Irf - The measured intensity of the signal at a reference distance.
     * @param {number} Irx - The measured intensity of the signal at the receiver.
     * @param {number} d0 - The known reference distance.
     * @returns {number} The estimated distance from the source.
     */
    static InverseSquareModel(Irf, Irx, d0, n = 2)
    {
        const ratio = Math.pow(Irf / Irx, 1 / n);
        const distance = d0 * ratio;
        return distance;
    }

    /**
     * Returns the Prx given a known distance.
     * 
     * @param {number} n a measure of the influence of obstacles like partitions, walls and doors.
     * @param {number} Ptx the transmitted power level (TSSI) in dBm.
     * @param {number} d0 The known reference distance.
     * @param {number} Gtx the antennae gain of the transmitter in dBi.
     * @param {number} Grx the antennae gain of the receiver in dBi.
     * @param {number} Xa a normal random variable with a standard deviation of a.
     * @param {number} l the wavelength of the signal in meters.
     * @returns {Number} Prx the power level measured at the receiver (RSSI) in dBm.
     */
    static hataOkumaraReversed(n, Ptx, d0, Gtx, Grx, Xa, l) {
        const pathLossDueToDistance = 10 * n * Math.log10(d0);
        const constantPathLoss = 20 * Math.log10(l) - 20 * Math.log10(4 * Math.PI);
        
        const Prx = Ptx + Gtx + Grx - Xa - pathLossDueToDistance + constantPathLoss;
        
        return Prx;
    }
    
    /**
     * 
     * @param {object} source Any { x, y } object, including Konva elements.
     * @param {object} target Any { x, y } object, including Konva elements
     * @returns number The distance between the two points.
     */
    static getDistance(source, target)
    {
        let source_x = typeof source.x === "function" ? source.x() : source.x;
        let source_y = typeof source.y === "function" ? source.y() : source.y;

        let target_x = typeof target.x === "function" ? target.x() : target.x;
        let target_y = typeof target.y === "function" ? target.y() : target.y;

        var a = source_x - target_x;
        var b = source_y - target_y;

        return Math.sqrt(a * a + b * b);
    }

    /**
     * 
     * @param {number} value 
     * @param {number} decimals 
     * @returns {number} The rounded value.
     */
    static round(value, decimals) 
    {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
}