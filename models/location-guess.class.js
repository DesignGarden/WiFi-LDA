export default class LocationGuess
{
    /**
     * @constructor
     * @param {number} x 
     * @param {number} y 
     * @param {number} area 
     * @param {boolean} withinZones 
     */
    constructor(x, y, area, withinZones)
    {
        /**
         * type {number} The x coordinate in meters.
         */
        this.x = x;

        /**
         * type {number} The y coordinate in meters.
         */
        this.y = y;

        /**
         * type {number} The area in square meters.
         */
        this.area = area;

        /**
         * type {boolean} Whether the guess is within a zone.
         */
        this.withinZones = withinZones;
    }
}