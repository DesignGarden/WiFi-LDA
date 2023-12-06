export default class Office
{
    static Vendors = null;

    Math = Math;
    Minute = 1 * 1 * 60 * 1000;

    Name = "";
    MetersToPixels = 1;
    PixelsToMeters = 1;
    Network = 0;
    SchematicUrl = "";
    Saves = [];
    ReferenceMacs = {};
    IgnoreMacs = [];
    MacLookupCallback = null;
    GeoTransform = null;
    ImageOffset = null;
    onlyShowRefs = false;

    constructor(officeData)
    {
        if (officeData == null) return;

        this.Copy(officeData);

        this.PixelsToMeters = 1 / this.MetersToPixels;

        this.FeetToPixels = this.MetersToPixels / 3.28084;
        this.PixelsToFeet = 1 / this.FeetToPixels;
    }

    Copy(officeData)
    {
        if (officeData.ReferenceMacs)
        {
            let updatedMacs = {};
            for (let mac in officeData.ReferenceMacs)
            {
                updatedMacs[mac.toLowerCase()] = officeData.ReferenceMacs[mac];
            }
            officeData.ReferenceMacs = updatedMacs;
        }

        Object.assign(this, officeData);
    }

    /**
     * 
     * @param {string} path 
     * @returns 
     */
    static async _loadJsonFile(path)
    {
        try
        {
            return await $.getJSON(path);
        } catch (error)
        {
            console.error(error);
            return null;
        }
    }

    static async InitDefaultOffices()
    {
        const officeFiles = [
            './data/offices/example.office.json',
        ];

        const loadedOffices = await Promise.all(officeFiles.map(file => Office._loadJsonFile(file)));

        return loadedOffices.map(office => new Office(office));
    }

    static async OuiIsValid(mac)
    {
        if (Office.Vendors === null)
            Office.Vendors = await Office._loadJsonFile('./data/macs/vendor-macs.json');

        return Office.Vendors.includes(mac.substring(0, 8).toLowerCase());
    }

    GetGeoTransform()
    {
        return this.GeoTransform;
    }

    Save()
    {
        let flat = {};

        return flat;
    }

    Load(flat)
    {

    }

    /**
     * 
     * @param {Person} person 
     */
    AddExpectedToPerson(person)
    {
        for (let expected of this.ReferenceMacs[person.mac.toLowerCase()].Expected)
            person.AddExpected(expected.Start, expected.End, expected.Location);
    }

    /**
     * Check if a MAC address is possibly randomized.
     * 
     * For IEEE assigned MAC addresses, the second least significant bit of the first octet of the MAC address is used 
     * to distinguish between locally and globally assigned MAC addresses. 
     * If it's set to 1, it's locally assigned, which may indicate it's a randomized MAC address.
     * 
     * @param {string} macAddress - The MAC address to check
     * @returns {Promise<boolean>} True if the MAC address is possibly randomized, false otherwise
     */
    async isPossiblyRandomized(macAddress)
    {
        if (await Office.OuiIsValid(macAddress)) return false;
        // Remove any colons or hyphens from the MAC address
        macAddress = macAddress.toLowerCase().replace(/[:-]/g, "");
        // Get the first octet of the MAC address
        let firstOctet = parseInt(macAddress.slice(0, 2), 16);
        // Check the second least significant bit of the first octet
        return (firstOctet & 2) === 2;
    }

    /**
     * 
     * @param {Promise<Person>} person 
     */
    async MacLookup(person)
    {
        if (person.mac.toLowerCase() in this.ReferenceMacs)
        {
            person.fill = person.color.AsStyle();
            person.hide = false;
            person.IsReference(true);
            let lookupKey = person.mac.replace(/:/g, '').substring(0, 6);
            console.info(person.mac, "https://maclookup.app/search?mac=" + lookupKey);
            this.AddExpectedToPerson(person);
        }
        else
        {
            person.IsRandomized(await this.isPossiblyRandomized(person.mac));

            let lookupKey = person.mac.replace(/:/g, '').substring(0, 6);
            console.log(person.mac, "https://maclookup.app/search?mac=" + lookupKey);
            person.opacity = 0.25;
            person.fill = person.color.AsStyle();
            person.hide = this.onlyShowRefs;
        }
    }
}