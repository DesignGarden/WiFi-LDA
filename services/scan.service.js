import SensorManager from './sensor-manager.service.js';
import Person from '../core/person.class.js';
import FileSystem from './file-system.service.js';
import Dashboard from '../ui/dashboard.class.js';
import DistanceCalculation from '../core/distance-calculation.class.js';
import Sensor from '../core/sensor.class.js';

export default class Scan
{
    /**
     * 
     * @param {Dashboard} db
     * @param {Date} time 
     * @param {Date} end 
     * @param {number} period 
     */
    static async ScanTimeRange(db, time, end, period = 5)
    {
        const { selectedOffice, slider } = db;
        const peopleScan = [];
        const devices = await Promise.all(Object.keys(selectedOffice.ReferenceMacs).map(async mac =>
        {
            const person = new Person(db.peopleLayer, db.timelineLayer, db.guessLayers[0], mac);
            await selectedOffice.MacLookup(person);
            selectedOffice.AddExpectedToPerson(person);
            return person;
        }));

        const distanceErrors = [["time", 'AP MAC', ...devices.map(device => device.mac)]];

        for (let currentTime = time.getTime(); currentTime <= end.getTime(); currentTime += 5 * selectedOffice.Minute)
        {
            slider.SetTime(currentTime);
            const timeStart = new Date(slider.GetTime().getTime() - period * 60 * 1000);

            await db.AddSignalsAndDraw(timeStart, slider.GetTime());

            peopleScan.push({ "time": currentTime, "people": db.people });

            distanceErrors.push(
                ...Scan._getDistanceErrors(db.calculator, currentTime, db.sensors, devices)
            );

            // Since upgrading Konva, the draw action fails without a delay between scans.
            //await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const trilaterationErrors = Scan._getTrilaterationErrors(devices.map(device => device.mac), db.zones, peopleScan);

        FileSystem.DownloadCsv("trilateration_errors", trilaterationErrors);
        FileSystem.DownloadCsv("distance_errors", distanceErrors);
    }

    /**
     * Performs a scan of every 15 minute from "time" to "end" to fill the headcounts array with sum of headcounts across all zones.
     * 
     * @param {Dashboard} db
     * @param {Date} time 
     * @param {Date} end 
     * @param {number} period 
     */
    static async HeadcountScan(db, time, end, period = 15)
    {
        const { selectedOffice, slider } = db;

        selectedOffice.onlyShowRefs = false;

        const headcounts = [["Time", 'Day', 'Headcount']];

        for (let currentTime = time.getTime(); currentTime <= end.getTime(); currentTime += period * 60 * 1000)
        {
            slider.SetTime(currentTime);
            const timeStart = new Date(slider.GetTime().getTime() - period * 60 * 1000);

            await db.AddSignalsAndDraw(timeStart, slider.GetTime());

            const dateObj = new Date(currentTime);
            const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            const totalHeadcount = db.zones.reduce((total, zone) => total + zone.GetHeadCount(), 0);

            headcounts.push([formattedTime, dayName, totalHeadcount]);
        }

        FileSystem.DownloadCsv("headcounts_" + selectedOffice.Name, headcounts);
    }


    /**
     * 
     * @param {string[]} pMacs 
     * @param {Zone[]} zones 
     * @param {Array} peopleScan An array of objects of the form {time: number, people: Person[]}
     * @returns 
     */
    static _getTrilaterationErrors(pMacs, zones, peopleScan)
    {
        const header = ["time", 'total seen', ...pMacs, ...zones.map((_, i) => `zone ${i}`)];

        const rows = peopleScan.map(scan =>
        {
            const peopleErrors = pMacs.map(mac =>
            {
                /**
                 * @type {Person}
                 */
                const person = scan.people.find(x => x.getMac().toLowerCase() === mac.toLowerCase());
                return person ? person.GetError(3, scan.time) : '';
            });
            return [new Date(scan.time), scan.people.length, ...peopleErrors, ...zones.map(zone => zone.GetHeadCount())];
        });

        return [header, ...rows];
    }

    /**
     * 
     * @param {DistanceCalculation} calculator 
     * @param {number} time 
     * @param {Array<Sensor>} sensors 
     * @param {Array<Person>} people 
     * @returns {Array<Array>} An array of arrays of the form [time, sensor mac, ...distance errors]
     */
    static _getDistanceErrors(calculator, time, sensors, people)
    {
        return sensors.map(sensor =>
        {
            const distances = people.map(person =>
            {
                const guess = DistanceCalculation.CalculateDistance(sensor, person.getMac());
                const actual = sensor.GetDistanceToExpected(person, time);
                return guess ? guess.distance - actual : '';
            });
            return [new Date(time), sensor.getMac(), ...distances];
        });
    }
}