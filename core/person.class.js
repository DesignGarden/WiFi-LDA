import Color from '../models/color.class.js';
import Location from '../models/location.class.js';
import SignalLines from '../ui/signal-lines.class.js';
import Konva from "Konva";
import Zone from './zone.class.js';
import Sensor from './sensor.class.js';
import DistanceCalculation from '../core/distance-calculation.class.js';
import DiscreteProbabilityMath from '../services/discrete-probability-math.service.js';
import GeoTransform from '../services/geo-transform.service.js';
import { SelectedOffice } from "../main.js";

export default class Person
{
    /**
     * @type {string}
     */
    mac;

    constructor(layer, timelineLayer, guessLayer, mac) 
    {
        /**
         * @type {boolean}
         */
        this.CalibrationIsSet = false;

        /**
         * @type {string[]}
         */
        this.pseudoMacs = [];

        /**
         * @type {Location[]}
         */
        this.LocationGuesses = [];

        /**
         * @type {Location[]}
         */
        this.LocationExpected = [];

        this.setMac(mac);

        /**
         * @type {Konva.Layer}
         */
        this.layer = layer;

        /**
         * @type {Konva.Layer}
         */
        this.timelineLayer = timelineLayer;

        /**
         * @type {Konva.Layer}
         */
        this.guessLayer = guessLayer;

        this.HeatmapsAtTime = { 0: [] };

        this.menuNode = document.getElementById('person-context-menu');

        this.macInput = document.getElementById('person-mac-input');

        /**
         * @type {string}
         */
        this.name = '';

        this.radius = 0.47 * SelectedOffice.MetersToPixels;

        this.fill = 'rgb(' + 255 + ', ' + 255 + ', ' + 255 + ')';
        this.color = new Color().SetRgbFromMac(mac);
        this.opacity = 0.75;
        this.hide = false;
        this.randomized = false;
        this.psuedo = false;
        this.reference = false;

        this.xExpected = null;
        this.yExpected = null;
        this.expected = null;

        this.macInput.addEventListener('blur', () =>
        {
            if (this.node == null) return;

            if (this.menuNode.targetNodeId !== this.node.id()) return;

            this.setMac($(this.macInput).val());
            this.layer.draw();
        });
    }

    /**
     * 
     * @param {number} time A time value in milliseconds since midnight, January 1, 1970 UTC.
     * @param {number} centerX 
     * @param {number} centerY 
     * @param {number} expectedX 
     * @param {number} expectedY 
     */
    AddGuess(time, centerX, centerY, expectedX, expectedY)
    {
        this.RemoveGuess(time);

        this.LocationGuesses.push(new Location(
            time, null,
            centerX - this.radius / 2,
            centerY - this.radius / 2
        ));

        this.LocationGuesses.sort((a, b) => a.time - b.time);
    }

    /**
     * @param {number} time A time value in milliseconds since midnight, January 1, 1970 UTC.
     */
    RemoveGuess(time)
    {
        this.LocationGuesses = this.LocationGuesses.filter(x => x.time !== time);
    }

    /**
     * @param {number} time A time value in milliseconds since midnight, January 1, 1970 UTC.
     * @returns {Location} The guess at the given time.
     */
    GetGuess(time)
    {
        let [guess = null] = this.LocationGuesses.filter(x => x.time === time);
        return guess;
    }

    /**
     * @param {number} time A time value in milliseconds since midnight, January 1, 1970 UTC.
     * @returns {boolean} True if a guess exists at the given time.
     */
    HasGuess(time)
    {
        return this.GetGuess(time) !== null;
    }

    /**
     * 
     * @param {number} startTime 
     * @param {number} endTime 
     * @param {number} centerX 
     * @param {number} centerY 
     */
    AddExpected(startTime, endTime, centerX, centerY)
    {
        if (centerX == null && centerY == null) return;

        if (typeof centerX === 'object')
        {
            centerY = centerX.y;
            centerX = centerX.x;
        }

        this.LocationExpected.push(new Location(
            startTime,
            endTime,
            centerX - this.radius / 2,
            centerY - this.radius / 2)
        );

        this.LocationExpected.sort((a, b) => a.startTime - b.startTime);
    }

    /**
     * 
     * @param {number} time The time to get the expected location for.
     * @returns {Location} The expected location at the given time.
     */
    GetExpected(time)
    {
        let [value = null] = this.LocationExpected.filter(x => x.startTime <= time && time <= x.endTime);

        if (value === null)
            [value = null] = this.LocationExpected.filter(x => x.startTime === null && x.endTime === null);

        return value;
    }

    /**
     * 
     * @param {number} time The time to get the expected location for.
     * @returns {boolean} True if an expected location exists at the given time.
     */
    HasExpected(time)
    {
        return this.GetExpected(time) !== null;
    }

    /**
     * 
     * @param {number} time 
     * @param {Sensor[]} sensors 
     * @param {SignalLines} signalLines 
     */
    DrawGuess(time, sensors, signalLines)
    {
        this.CalibrationIsSet = false;

        /**
         * An array of Konva.Line objects representing the timelines between location guesses.
         * @type {Konva.Line[]}
         */
        const timelines = this.LocationGuesses.slice(1).map((curr, i) =>
        {
            const prev = this.LocationGuesses[i];

            return (prev !== null && curr !== null) && new Konva.Line({
                stroke: this.fill,
                strokeWidth: 1,
                opacity: 0.25 + 0.1 * (i + 1) / this.LocationGuesses.length,
                points: [prev.x, prev.y, curr.x, curr.y]
            });
        }).filter(Boolean);

        const guess = this.GetGuess(time);
        if (guess === null) return;

        const { x, y } = guess;

        this.node = new Konva.Circle({
            x,
            y,
            radius: this.radius,
            fill: this.fill,
            strokeWidth: 0,
            draggable: false,
            name: 'person-guess',
            opacity: this.opacity
        });

        const expectedData = this.GetExpected(time) || {};
        const { x: xExpected = null, y: yExpected = null } = expectedData;

        this.xExpected = xExpected;
        this.yExpected = yExpected;

        this.expected = (xExpected !== null && yExpected !== null) && new Konva.Circle({
            x: xExpected,
            y: yExpected,
            radius: this.radius / 2,
            fill: this.fill,
            strokeWidth: 0,
            draggable: false,
            name: 'person-expected',
            opacity: 0.5
        });

        const line = this.expected && new Konva.Line({
            stroke: this.fill,
            strokeWidth: 1,
            opacity: 0.5,
            points: [xExpected, yExpected, x, y]
        });

        const errorText = this.expected && new Konva.Text({
            x: (xExpected - x) / 2 + x,
            y: (yExpected - y) / 2 + y,
            text: this.GetErrorInFeet(2, time) + 'ft', // Meters to Feet,
            fontSize: 12,
            fontFamily: 'Calibri',
            fill: this.fill
        });

        this.calibration = new Konva.Circle({
            x,
            y,
            radius: this.radius,
            stroke: 'black',
            strokeWidth: 1,
            draggable: true,
            name: 'person-guess',
            opacity: 0.75
        });

        this.label = new Konva.Label({
            x: x - 20,
            y: y + 20
        });

        this.text = new Konva.Text({
            x: 0,
            y: 0,
            text: this.IsReference() ? this.mac.toUpperCase() : "",
            // text: this.IsReference() ? this.name ?? this.mac.toUpperCase() : "",
            // text: this.mac.toUpperCase(),
            fontSize: 8,
            lineHeight: 1.2,
            fill: 'black'
        });

        this.calibration.on('mouseover', () =>
        {
            document.body.style.cursor = 'pointer';
            signalLines.Show(this, sensors);
            if (!this.IsPseudo())
            {
                this.DrawHeatmapsAtTime(time);
                DistanceCalculation.AdjustOpacityByProximity(this.GuessLayer(), sensors);
            }
        });

        this.calibration.on('mouseout', () =>
        {
            document.body.style.cursor = 'default';
            signalLines.Hide();
            if (!this.IsPseudo()) this.GuessLayer().clear();
        });

        this.calibration.on('dragend', () => this.CalibrationIsSet = true);

        this.node.addEventListener('contextmenu', e =>
        {
            e.preventDefault();

            const containerRect = this.layer.getStage().container().getBoundingClientRect();
            const { x: pointerX, y: pointerY } = this.layer.getStage().getPointerPosition();

            this.menuNode.targetNodeId = this.node.id();
            $(this.macInput).val(this.mac);
            Object.assign(this.menuNode.style, {
                display: 'initial',
                top: `${containerRect.top + pointerY + 4}px`,
                left: `${containerRect.left + pointerX + 4}px`
            });
        });

        this.label.add(this.text);
        this.layer.add(this.node, this.calibration, this.label);
        timelines.forEach(tl => this.timelineLayer.add(tl));
        if (this.expected)
        {
            this.layer.add(this.expected, line, errorText);
        }
    }

    IsHidden(value)
    {
        if (value === true || value === false)
            this.hide = value;

        return this.hide;
    }

    IsRandomized(value)
    {
        if (value === true || value === false)
            this.randomized = value;

        return this.randomized;
    }

    /**
     * 
     * @param {boolean} value 
     * @returns {boolean} True if the person is a pseudo person, false otherwise.
     */
    IsPseudo(value)
    {
        if (value === true || value === false)
            this.psuedo = value;

        return this.psuedo;
    }

    /**
     * 
     * @param {string[]} value A list of MAC addresses that are associated with this person.
     */
    SetPseudoMacs(value)
    {
        this.pseudoMacs = value;
    }

    IsReference(value)
    {
        if (value === true || value === false)
            this.reference = value;

        return this.reference;
    }

    GuessLayer()
    {
        return this.guessLayer;
    }

    /**
     * 
     * @param {number} round The number of digits to round to.
     * @param {number} time The time to get the expected location and guess for.
     * @returns {number} The error in meters.
     */
    GetError(round, time)
    {
        const e = this.GetExpected(time);

        const source = this.GetGuess(time);

        if (source == null) return -1;

        const error = this.getDistance(source, e);

        return round != null ? DiscreteProbabilityMath.round(error, round) : error;
    }

    GetErrorInFeet(round, time)
    {
        const error = this.GetError(null, time) * 3.28084;

        return round != null ? DiscreteProbabilityMath.round(error, round) : error;
    }

    GetDistanceToPerson(person, time)
    {
        let source = this.GetGuess(time);
        let target = person.GetGuess(time);

        if (source === null || target === null) return -1;

        return this.getDistance(source, target);
    }

    IsKnownDevice()
    {
        return this.name !== null && this.mac !== null && this.name.toUpperCase() !== this.mac.toUpperCase();
    }

    getNode()
    {
        return this.node;
    }

    getCalibration()
    {
        let x = this.calibration.x() + this.radius / 2;
        let y = this.calibration.y() + this.radius / 2;

        return {
            x: () =>
            {
                return x;
            },
            y: () =>
            {
                return y;
            }
        };
    }

    /**
     * 
     * @param {string} mac The MAC address of the person's device.
     */
    setMac(mac)
    {
        this.mac = mac.toLowerCase();
    }

    /**
     * 
     * @returns {string} The MAC address of the person's device.
     */
    getMac()
    {
        return this.mac.toLowerCase();
    }

    /**
     * 
     * @param {*} source Any { x, y } object, including Konva elements.
     * @param {*} target Any { x, y } object, including Konva elements
     * @returns 
     */
    getDistance(source, target)
    {
        return DiscreteProbabilityMath.getDistance(source, target) * SelectedOffice.PixelsToMeters;
    }

    /**
     * This method is designed to find and locate people on a map/heatmap.
     * 
     * This code guesses the location of a person by leveraging heatmaps that represent the radial distance from certain centers (likely sensors). 
     * These heatmaps are superimposed on a Konva layer. The darkest pixel on the heatmap is considered to be the probable location of the person.
     * 
     * @param {Array<Sensor>} sensors
     * @param {Array<Person>} people 
     * @param {number} time A time value in milliseconds since midnight, January 1, 1970 UTC.
     * @param {Konva.Layer} guessLayer Konva layer with probabilistic heatmaps of person positions.
     * @param {Konva.Layer} peopleLayer A Konva layer specifically representing people.
     * @param {Konva.Layer} timelineLayer A Konva layer that represents time-based data related to people's movements.
     * @param {Array<Zone>} zones An array of zones, which might are specific areas of interest on the map.
     * @param {boolean} useMerakiLocations
     * @returns {Promise<Array<Person>>} an array of people, with updated locations where available.
     */
    static async GetPeople(sensors, people, time, guessLayer, peopleLayer, timelineLayer, zones, useMerakiLocations = false)
    {
        // This delay is necessary to allow the UI to update.
        await new Promise(r => setTimeout(r, 0));

        const DIAGNOSTICS_START = Date.now();
        Color.ColorIndex = 0;

        guessLayer.clear();

        const sensorCountPerMac = {};

        sensors.forEach(sensor => sensor.seenMacs.forEach(mac => sensorCountPerMac[mac] = (sensorCountPerMac[mac] || 0) + 1));

        for (const mac in sensorCountPerMac)
        {
            if (sensorCountPerMac[mac] < 2) continue;

            let person = people.find(x => x.getMac() === mac);
            if (!person)
            {
                person = new Person(peopleLayer, timelineLayer, guessLayer, mac);
                await SelectedOffice.MacLookup(person);
                people.push(person);
            }

            if (person.IsHidden()) continue;

            person.RemoveGuess(time);

            if (useMerakiLocations)
            {
                const transform = SelectedOffice.GetGeoTransform();

                for (let s of sensors)
                {
                    let readings = s.GetFullReadingsByMac(person.getMac());
                    if (!readings.length || !transform) continue;

                    let expected = GeoTransform.transformGeoToPixels(readings[0].lat, readings[0].lng, transform);

                    if (!expected) continue;

                    person.AddGuess(time, expected.x, expected.y);

                    // TODO: This is debug code. Meraki gives ridiculous locations for some devices, and 
                    //       it seems to correlate with devices that our algorithm also has trouble with, 
                    //       so let's just hide those.
                    if (expected.x > 5000) person.hide = true;

                    break; // I assume that all sensors agree on the location of a device, so we only need to check one.
                }
            }
            else
            {
                const heatmaps = sensors.filter(s => s.active).map(sensor =>
                    DistanceCalculation.GetHeatmap(DistanceCalculation.CalculateDistance(sensor, mac), sensor.getNode().x(), sensor.getNode().y(), mac)).filter(Boolean);

                person.AddHeatmapsAtTime(time, heatmaps);
                person.DrawHeatmapsAtTime(time);
                DistanceCalculation.AdjustOpacityByProximity(guessLayer, sensors);

                const positionGuess = DistanceCalculation.GuessPersonPosition(guessLayer, zones);
                guessLayer.destroyChildren();
                guessLayer.clear();

                if (positionGuess) person.AddGuess(time, positionGuess.x, positionGuess.y);
            }
        }

        console.log('GetPeople (ms)', Date.now() - DIAGNOSTICS_START);
        return people;
    }

    /**
     * Given an input array of people, identified by their device's MAC address, returns a consolidated list of "Pseudo" people 
     * who are holding devices that randomize their MAC address. The devices with randomized MAC addresses can be hidden from
     * the display and analytics, and replaced by their associated Pseudo Person.
     * 
     * @param {Array<Person>} people An array of Person objects, where each Person is identified by a device with a unique MAC address.
     * @param {number} time The time value in milliseconds since midnight, January 1, 1970 UTC.
     * @returns {Promise<Array<Person>>} The consolidated array of "Pseudo" people.
     */
    static async GetPseudoPeople(people, time)
    {
        // People (devices) within this range (meters) of each other will be consolidated into a single "Pseudo Person".
        const ConsolidationRadius = 3;

        // Filter out the people/devices that have randomized MAC addresses
        let randoms = people.filter(x => x.IsRandomized());

        let groups = [];

        // Loop through each person/device with a randomized MAC address
        for (let r of randoms)
        {
            // Skip the current person/device if it does not have a guess location at the given time
            if (!r.HasGuess(time)) continue;

            let matchedGroup = false;
            // Check each existing group to see if the current person/device is within the ConsolidationRadius of any person/device in the group
            for (let g of groups)
                if (!matchedGroup)
                    for (let n of g)
                        if (n.GetDistanceToPerson(r, time) < ConsolidationRadius)
                        {
                            // If it is, add it to the group and break the loop
                            g.push(r);
                            matchedGroup = true;
                            break;
                        }

            // If the current person/device did not match any existing group, create a new group with it
            if (!matchedGroup)
                groups.push([r]);
        }

        let pseudos = [];

        // Combine each group of people/devices into a single "Pseudo Person"
        for (let g of groups)
        {
            // If the group only has one person/device, just add it to the list of Pseudo People
            if (g.length === 1)
            {
                pseudos.push(g[0]);
                continue;
            }

            let combinedMacs = [];
            // Combine the MAC addresses of all the people/devices in the group
            for (let p of g)
                combinedMacs.push(p.mac);

            // Create a new Pseudo Person using the information from the first person/device in the group
            let pseudo = new Person(g[0].layer, g[0].timelineLayer, g[0].guessLayers, g[0].mac);
            await SelectedOffice.MacLookup(pseudo);
            pseudo.name = "PSEUDO (" + g.length + ")";
            pseudo.IsPseudo(true);
            pseudo.SetPseudoMacs(combinedMacs);

            // Set the location guess of the Pseudo Person so it can be displayed instead of the devices with randomized MAC addresses.
            // TODO: Average the position of the combined devices.
            let guess = g[0].GetGuess(time);
            pseudo.AddGuess(time, guess.x, guess.y);
            pseudos.push(pseudo);
        }

        return pseudos;
    }

    /**
     * 
     * @param {number} time 
     * @param {Konva.Circle[]} heatmaps 
     */
    AddHeatmapsAtTime(time, heatmaps)
    {
        this.HeatmapsAtTime[time] = heatmaps;
    }

    DrawHeatmapsAtTime(time)
    {
        this.guessLayer.destroyChildren();
        this.guessLayer.clear();
        this.HeatmapsAtTime[time]?.forEach(heatmap => this.guessLayer.add(heatmap));
        this.guessLayer.draw();
    }
}