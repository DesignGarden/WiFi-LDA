export default class ProbeRequest
{
    /**
     * The ID of the access point.
     * @type {number}
     */
    access_points_id;

    /**
     * The MAC address.
     * @type {string}
     */
    mac;

    /**
     * The count.
     * @type {number}
     */
    count;

    /**
     * The minimum signal strength.
     * @type {number}
     */
    min_signal;

    /**
     * The maximum signal strength.
     * @type {number}
     */
    max_signal;

    /**
     * The average signal strength.
     * @type {number}
     */
    avg_signal;

    /**
     * The timestamp when first seen.
     * @type {number}
     */
    first_seen;

    /**
     * The timestamp when last seen.
     * @type {number}
     */
    last_seen;

    /**
     * Indicates if the data is from a Meraki device. (e.g., 1 for true, 0 for false)
     * @type {number}
     */
    is_meraki;

    /**
     * The latitude coordinate.
     * @type {number}
     */
    lat;

    /**
     * The longitude coordinate.
     * @type {number}
     */
    lng;

    /**
     * The uncertainty value for the location coordinates.
     * @type {number}
     */
    unc;
}