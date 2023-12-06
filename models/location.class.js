export default class Location
{
    /**
     * @type {number}
     */
    startTime;

    /**
     * @type {number}
     */
    endTime;

    /**
     * @type {number}
     */
    x;

    /**
     * @type {number}
     */
    y;

    /**
     * 
     * @param {number} startTime 
     * @param {number} endTime 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(startTime, endTime, x, y)
    {
        this.startTime = startTime;
        this.endTime = endTime;
        this.x = x;
        this.y = y;
    }

    /**
     * @type {number}
     */
    get time() {
        return this.startTime;
    }

    /**
     * @param {number} value
     */
    set time(value) {
        this.startTime = value;
    }
}