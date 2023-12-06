import Api from '../services/api.service.js';
import DiscreteProbabilityMath from '../services/discrete-probability-math.service.js';
import Color from '../models/color.class.js';
import Dashboard from "../ui/dashboard.class.js";
import Person from './person.class.js';
import { SelectedOffice } from '../main.js';
import Konva from "Konva";

export default class Sensor
{
    static sensorCount = 0;

    /**
     * @type {Array<Konva.Text>}
     */
    static signalGrid = [];

    active = true;

    Ptx = 20;
    Gtx = 2.5;
    Grx = 2.5;
    Xa = -5;
    n1 = 5;
    n2 = 4;
    l = 0.12;
    access_points_id = null;
    api = new Api();

    /**
     * @type {Array<string>}
     */
    seenMacs = [];

    readings = [];

    /**
     * @type {Array<Konva.Circle>}
     */
    guesses = [];

    /**
     * @type {Konva.Layer}
     */
    layer;

    /**
     * @type {Konva.Layer}
     */
    visualizationLayer;

    /**
     * @constructor
     * @param {Konva.Layer} layer 
     * @param {Konva.Layer} visualizationLayer 
     * @param {string} mac 
     * @param {Dashboard} dashboard 
     * @param {number} PIXELS_TO_METERS 
     * @param {string} reportingServer 
     */
    constructor(layer, visualizationLayer, mac, dashboard, reportingServer)
    {
        this.uid = `sensor-${Sensor.sensorCount++}`;
        this.mac = mac;
        this.layer = layer;
        this.visualizationLayer = visualizationLayer;
        this.reportingServer = reportingServer;

        if (!Sensor.signalGrid.length)
            this.initializeSignalGrid();

        this.initDOMBindings();
        this.initKonvaElements(dashboard);

        this.$menuDeleteButton.on('click', () => this.handleDeleteClick(dashboard.sensors));
    }

    /**
     * @private
     */
    initializeSignalGrid()
    {
        for (let x = 0; x < this.visualizationLayer.width(); x += 50)
            for (let y = 0; y < this.visualizationLayer.height(); y += 50)
            {
                const node = new Konva.Text({
                    text: 0, x: x - 4, y: y - 4,
                    fontSize: 11, fontStyle: 'bold', fontFamily: 'Calibri', fill: 'gray'
                });
                this.visualizationLayer.add(node);
                Sensor.signalGrid.push(node);
            }
    }

    /**
     * @private
     */
    initDOMBindings()
    {
        this.$menuNode = $('#sensor-context-menu');
        this.$sensorMacInput = $('#sensor-mac-input');
        this.$menuDeleteButton = $('#delete-button');
        this.$sensorActiveCheckbox = $('#sensor-active');
        this.inputs = {
            Ptx: $('#Ptx'), Gtx: $('#Gtx'), Grx: $('#Grx'), Xa: $('#Xa'),
            l: $('#l'), n1: $('#n1'), n2: $('#n2')
        };
    }

    /**
     * @private
     * @param {Dashboard} dashboard 
     */
    initKonvaElements(dashboard)
    {
        this._group = new Konva.Group({ x: 50, y: 50, name: 'sensor', draggable: true });

        this.object = new Konva.Rect({
            width: 15,
            height: 20,
            fill: this.readings.length ? 'green' : 'gray',
            stroke: 'black',
            strokeWidth: 2,
            name: 'object'
        });

        this._label = new Konva.Label();

        this._text = new Konva.Text({
            x: 2, y: 5, text: 0, fontSize: 10, lineHeight: 1.2, fill: 'black'
        });
        this._label.add(this._text);

        this.setEventListeners(dashboard);

        this._group.add(this.object, this._label).id(this.uid);
        this.layer.add(this._group);
    }

    x()
    {
        return this._group.x();
    }

    y()
    {
        return this._group.y();
    }

    /**
     * @private
     * @param {Dashboard} dashboard 
     */
    setEventListeners(dashboard)
    {
        this._group.on('mouseover', () =>
        {
            document.body.style.cursor = 'pointer';
            this.RecalculateSignalGrid();
            this.visualizationLayer.draw();
        });

        this._group.on('mouseout', () =>
        {
            document.body.style.cursor = 'default';
            if (!this.IsFocused()) this.visualizationLayer.clear();
        });

        this._group.on('dragend', async () =>
        {
            await dashboard.DrawGuesses(true);
        });

        this._group.addEventListener('contextmenu', e =>
        {
            e.preventDefault();
            this.showContextMenu();
        });

        this.$sensorMacInput.on('blur', e =>
        {
            if (this.IsFocused())
            {
                this.setMac($(e.target).val(), SelectedOffice.Network);
            }
        });

        this.$sensorActiveCheckbox.on('change', async e => 
        {
            if (!this.IsFocused()) return;
            this.active = $(e.target).is(':checked');
            this.object.fill(this.active ? 'green' : 'gray');
            this.layer.draw();
            await dashboard.DrawGuesses(true);
        });

        for (const key in this.inputs)
        {
            this.inputs[key].on('change', async e =>
            {
                await this.SetPhysicalParameterFromInput($(e.target).val(), (v) => this[key] = v, dashboard);
            });
        }
    }

    /**
     * @private
     */
    showContextMenu()
    {
        const containerRect = this.layer.getStage().container().getBoundingClientRect();
        const pointerPosition = this.layer.getStage().getPointerPosition();

        this.$menuNode
            .attr("targetNodeId", this._group.id())
            .css({
                "display": 'initial',
                "top": `${containerRect.top + pointerPosition.y + 4}px`,
                "left": `${containerRect.left + pointerPosition.x + 4}px`
            });

        this.$sensorMacInput.val(this.mac);
        this.$sensorActiveCheckbox.prop('checked', this.active);
        for (const key in this.inputs)
        {
            $(this.inputs[key]).val(this[key]);
        }
    }

    /**
     * 
     */

    /**
     * @private
     * @param {Array<Sensor>} sensors 
     * @returns 
     */
    handleDeleteClick(sensors)
    {
        if (!this._group || this.$menuNode.attr("targetNodeId") !== this._group.id()) return;

        const index = sensors.findIndex(sensor => sensor._group.id() === this._group.id());

        if (index > -1)
        {
            sensors.splice(index, 1);
            this.Delete();
            this.layer.draw();
        }
    }

    Delete()
    {
        this._group.destroy();
    }

    async SetPhysicalParameterFromInput(value, callback, dashboard)
    {
        if (!this.IsFocused()) return;
        callback(parseFloat(value));
        this.RecalculateSignalGrid();
        this.visualizationLayer.draw();
        await dashboard.DrawGuesses(true);
    }

    /**
     * 
     * @param {number} value 
     * @param {string} key 
     */
    SetXa(value)
    {
        this.SetPhysicalParameter(value, 'Xa');
    }

    /**
     * 
     * @param {number} value 
     * @param {string} key 
     */
    SetPhysicalParameter(value, key = 'Xa')
    {
        this[key] = value;
        this.RecalculateSignalGrid();
        this.visualizationLayer.draw();
    }

    setReadings(readings = [])
    {
        this.readings = readings.filter(reading => Object.keys(SelectedOffice.ReferenceMacs).includes(reading.mac.toLowerCase()) || (!SelectedOffice.IgnoreMacs?.includes(reading.mac.toLowerCase()) ?? false));
        this.seenMacs = [...new Set(this.readings.map(reading => reading.mac))];

        const fillValue = this.readings.length > 0 ? 'green' : 'gray';
        this.object.fill(fillValue);
        this._label.getText().text(this.readings.length).fill(this.readings.length > 0 ? 'white' : 'black');
    }

    /**
     * 
     * @param {string} mac 
     * @returns boolean True if the sensor has readings for the given MAC address.
     */
    HasReadingsForMac(mac = '')
    {
        return this.seenMacs.includes(mac.toLowerCase());
    }

    RecalculateSignalGrid()
    {
        for (let i in Sensor.signalGrid)
        {
            let signal = this.GetSignalAtDistance(this.GetActualDistance(Sensor.signalGrid[i]));

            let offsetR = parseInt(Math.min(125, 125 * signal / -100));
            let offsetG = 125 - offsetR;
            let offsetB = parseInt(offsetG / 4);

            let color = new Color(85 + offsetR, 85 + offsetG, 95 - offsetB, 0.95);

            Sensor.signalGrid[i].fill(color.AsStyle());

            Sensor.signalGrid[i].text(parseInt(signal));
        }
    }

    /**
     * @private
     * @param {number} d 
     * @returns {number} Prx
     */
    GetSignalAtDistance(d)
    {
        let minDifference = Infinity;
        let bestSignal = null;

        // Warning: This must match what is seen in GetInterferenceCoefficient.
        for (let n = 4; n <= 5; n += 1.0)
        {

            let Prx = DiscreteProbabilityMath.hataOkumaraReversed(n, this.Ptx, d, this.Gtx, this.Grx, this.Xa, this.l);

            let nFromCoefficientFunction = this.GetInterferenceCoefficient(Prx);

            // Calculate the difference between the two values of n.
            let difference = Math.abs(n - nFromCoefficientFunction);

            if (difference < minDifference)
            {
                minDifference = difference;
                bestSignal = Prx;
            }
        }

        return bestSignal;
    }

    IsFocused()
    {
        if (this._group == null || this.$menuNode.attr("targetNodeId") !== this._group.id()) return false;

        return true;
    }

    /**
     * 
     * @returns {string} The MAC address of the sensor.
     */
    getMac()
    {
        return this.mac;
    }

    async setMac(mac)
    {
        this.mac = mac;
        const response = await this.api.GetSensorId(SelectedOffice.Network, this.mac);
        this.access_points_id = Math.max(...response.map(o => o.id));
    }

    getNode()
    {
        return this._group;
    }

    GetReadings()
    {
        return this.readings;
    }

    GetFullReadingsByMac(mac)
    {
        return this.GetReadings().filter(x => x.mac.toLowerCase() === mac.toLowerCase());
    }

    GetReadingsByMac(mac)
    {
        return this.GetFullReadingsByMac(mac).map(x => x.max_signal);
    }

    ClearGuesses()
    {
        this.guesses.length = 0;
    }

    /**
     * 
     * @param {Konva.Circle} guess
     */
    AddGuess(guess)
    {
        this.guesses.push(guess);
    }

    /**
     * 
     * @param {Person} person
     */
    FocusGuess(person)
    {
        for (let i in this.guesses)
        {
            console.log(this.guesses[i].mac);

            if (this.guesses[i].mac == person.getMac())
                this.guesses[i].show();
            else
                this.guesses[i].hide();
        }
    }

    ClearFocusGuess()
    {
        for (let i in this.guesses)
            this.guesses[i].show();
    }

    Save()
    {
        let flat = {};

        flat.Ptx = this.Ptx;
        flat.Gtx = this.Gtx;
        flat.Grx = this.Grx;
        flat.Xa = this.Xa;
        flat.l = this.l;
        flat.mac = this.mac;
        flat.access_points_id = this.access_points_id;
        flat.x = this._group.x();
        flat.y = this._group.y();
        return flat;
    }

    Load(flat)
    {
        this.Ptx = flat.Ptx;
        this.Gtx = flat.Gtx;
        this.Grx = flat.Grx;
        this.Xa = flat.Xa;
        this.l = flat.l;
        this.mac = flat.mac;
        this.access_points_id = flat.access_points_id;
        this._group.x(flat.x);
        this._group.y(flat.y);
    }

    GetActualDistance(target)
    {
        return DiscreteProbabilityMath.getDistance(this.getNode(), target) * SelectedOffice.PixelsToMeters;
    }

    /**
     * 
     * @param {Person} person
     * @param {number} time 
     * @returns {number} The distance between the sensor and the expected location of the person.
     */
    GetDistanceToExpected(person, time)
    {
        let expected = person.GetExpected(time);
        if (expected == null) return null;
        return DiscreteProbabilityMath.getDistance(this.getNode(), expected) * SelectedOffice.PixelsToMeters;
    }

    /**
     * Calculates n for the Hata Okumara equation.
     * 
     * For free space, n equals 2, but for obstructed paths in buildings, 
     * n is between 4 and 5 giving a much smaller communication range for 
     * the same settings.
     * 
     * @param {Number} Prx the transmitted power level (TSSI) in dBm.
     * @returns {Number} The Path-based interference coefficient (n).
     */
    GetInterferenceCoefficient(Prx)
    {
        let n = 0;

        if (Prx > -37) n = 5;
        else if (Prx > -40) n = 4;
        else if (Prx > -49) n = 4;
        else if (Prx > -55) n = 4;
        else n = 4;

        return n;
    }
}