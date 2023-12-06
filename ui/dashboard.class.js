import DistanceCalculation from '../core/distance-calculation.class.js';
import SensorManager from '../services/sensor-manager.service.js';
import Gui from './gui.class.js';
import GuideLines from './guidelines.class.js';
import SignalLines from './signal-lines.class.js';
import DistanceLines from './distancelines.class.js';
import Slider from '../partials/slider/slider.partial.js';
import Office from '../core/office.class.js';
import Api from '../services/api.service.js';
import Scan from '../services/scan.service.js';
import FileSystem from '../services/file-system.service.js';
import Person from '../core/person.class.js';
import Sensor from '../core/sensor.class.js';
import Zone from '../core/zone.class.js';
import Konva from "Konva";

export default class Dashboard
{
    urlParams = new URLSearchParams(window.location.search);
    inputFocused = false;
    reportingServer = "";
    SaveIndex = 0;

    /**
     * Time values in milliseconds since midnight, January 1, 1970 UTC.
     * @type {Array<number>}
     * @private
     */
    scanTimes = [];

    /**
     * @type {Array<Sensor>}
     * @private
     */
    sensors = [];

    /**
     * @type {Array<Zone>}
     * @private
     */
    zones = [];

    /**
     * @type {Array<Person>}
     * @private
     */
    people = [];

    /**
     * @type {Slider}
     */
    slider;

    /**
     * @type {Office}
     */
    selectedOffice;

    /**
     * @type {Konva.Stage}
     */
    stage;

    /**
     * @type {DistanceCalculation}
     */
    calculator;

    constructor(selectedOffice, numLayers)
    {
        this.selectedOffice = selectedOffice;
        this.numLayers = numLayers;
        this.initLayers();
        this.fileSystem = new FileSystem(this);
    }

    /**
     * @private
     */
    initLayers()
    {
        const layerNames = ['gridLayer', 'linesLayer', 'signalLinesLayer', 'schematicLayer', 'sensorVisualizationLayer', 'zoneLayer', 'layer', 'uiLayer', 'peopleLayer', 'timelineLayer'];
        this.guessLayers = Array(this.numLayers).fill().map(() => new Konva.Layer());
        layerNames.forEach(layer => this[layer] = new Konva.Layer());
    }

    /**
     * @private
     */
    addEventListeners = (selector, events) => $(selector).each((_, element) => events.forEach(({ event, handler }) => $(element).on(event, handler)));

    createLayers = numberOfLayers =>
    {
        const layers = ['gridLayer', 'linesLayer', 'signalLinesLayer', 'schematicLayer', 'sensorVisualizationLayer', 'zoneLayer', 'layer', 'uiLayer', 'peopleLayer', 'timelineLayer'];
        return layers.reduce((acc, layerName) => ({ ...acc, [layerName]: this[layerName] }), { guessLayers: this.guessLayers });
    };

    /**
     * @private
     * @param {Office} selectedOffice 
     */
    loadImage = selectedOffice =>
    {
        const { SchematicUrl, ImageOffset } = selectedOffice;
        if (!SchematicUrl) return;

        const imageObj = new Image();
        imageObj.onload = () =>
        {
            let [width, height] = [imageObj.width, imageObj.height];
            while (height > 850) [width, height] = [width * 0.9, height * 0.9];
            const img = new Konva.Image({ x: ImageOffset.x, y: ImageOffset.y, image: imageObj, width, height, opacity: 0.25 });
            this.schematicLayer.add(img).batchDraw();
        };
        imageObj.src = SchematicUrl;
    };

    async BuildGui()
    {
        const { innerWidth: width, innerHeight: height } = window;

        this.slider = new Slider($("#time-slider")[0], $("#date")[0], this.urlParams.get('date'));
        Konva.showWarnings = false;
        this.stage = new Konva.Stage({ container: 'container', width, height });

        this.addEventListeners('input', [
            { event: 'focus', handler: () => this.inputFocused = true },
            { event: 'blur', handler: () => this.inputFocused = false }
        ]);

        const offices = await Office.InitDefaultOffices();
        const selectedOffice = offices.find(o => o.Name === this.urlParams.get('office'));
        $('select#office').append(offices.map(o => new Option(o.Name, o.Name)))
            .val(selectedOffice?.Name)
            .on('change', function ()
            {
                window.location.search = `?office=${this.value}`;
            });

        if (selectedOffice) this.selectedOffice.Copy(selectedOffice);

        this.reportingServer = $('select#reporting-server')
            .on('change', () => this.reportingServer = $selectServer.val())
            .val();

        this.SaveIndex = $('select#profile')
            .append((this.selectedOffice.Saves ?? []).map((item, i) => $('<option>', { value: i, text: `Profile ${i}` })))
            .on('change', () => this.SaveIndex = $selectProfile.val())
            .val();

        this.stage.on('click', (e) => console.info(JSON.stringify(this.stage.getPointerPosition())));

        this.createLayers(this.numLayers);

        this.guidelines = new GuideLines(this.stage, this.gridLayer);
        this.distancelines = new DistanceLines(this.stage, this.linesLayer);
        this.signalLines = new SignalLines(this.stage, this.signalLinesLayer);
        this.calculator = new DistanceCalculation(this.stage);
        this.gui = new Gui(this.stage, this.uiLayer);

        [this.x, this.y] = [this.stage.width() / 2 - 50, this.stage.height() / 2 - 25];

        this.loadImage(this.selectedOffice);

        window.addEventListener('click', () =>
        {
            if (this.inputFocused) return;
            this.sensorVisualizationLayer.clear();
            $("#sensor-context-menu, #person-context-menu").attr("targetNodeId", "").hide();
        });

        this.stage.on('dragmove', () =>
        {
            this.layer.batchDraw();
            this.zoneLayer.batchDraw();
            this.peopleLayer.batchDraw();
        });

        this.stage.add(this.schematicLayer, this.gridLayer, this.linesLayer, this.zoneLayer, this.layer, this.uiLayer, this.peopleLayer, this.timelineLayer, ...this.guessLayers, this.signalLinesLayer, this.sensorVisualizationLayer);

        this.slider.OnChange(async () =>
        {
            if (this.scanTimes.includes(this.slider.GetTime().getTime())) await this.DrawGuesses();
        });

        this.guidelines.start();
        this.distancelines.start();
        this.schematicLayer.draw();
        this.uiLayer.draw();
    }

    GetCanvasOffset = () =>
    {
        const position = $('div#container').offset();
        return { x: position.left, y: position.top };
    };

    ToggleUILayerVisibility()
    {
        const visibility = this.uiLayer.visible();
        this.uiLayer.visible(!visibility);
        this.uiLayer.draw();
    }

    async scanDuration(duration, period = 5)
    {
        const end = new Date(this.slider.GetTime().getTime() + duration * 60 * 60 * 1000);

        await Scan.ScanTimeRange(this, this.slider.GetTime(), end, period);
    }

    async headcountScan(days = 1, period = 15)
    {
        const end = new Date(this.slider.GetTime().getTime() + days * 24 * 60 * 60 * 1000);

        await Scan.HeadcountScan(this, this.slider.GetTime(), end, period);
    }

    async getSignalsAndDrawGuesses(minuteDifference)
    {
        const timeEnd = this.slider.GetTime();
        const timeStart = new Date(timeEnd);
        timeStart.setMinutes(timeEnd.getMinutes() - minuteDifference);

        await this.AddSignalsAndDraw(timeStart, timeEnd);
    }

    /**
     * 
     * @param {Date} timeStart 
     * @param {Date} timeEnd 
     */
    async AddSignalsAndDraw(timeStart, timeEnd)
    {
        await SensorManager.addSignal(this.sensors, timeStart, timeEnd, this.reportingServer);
        await this.DrawGuesses();
    }

    async AddButtons(callback)
    {
        await callback(this.gui);

        this.uiLayer.draw();
    }

    async runBacnet()
    {
        this.slider.SetTime(new Date());
        const timeEnd = this.slider.GetTime();
        const timeStart = new Date(timeEnd);
        timeStart.setMinutes(timeEnd.getMinutes() - 15);

        await this.AddSignalsAndDraw(timeStart, timeEnd);

        const data = this.zones.map(z => ({
            "headcount": z.GetHeadCount(),
            "zoneId": z.Id
        }));

        await new Api().PostBacnetData(data);
    }

    /**
     * 
     * @param {boolean} manual Whether to use the calibration (manual) or the expected location (auto).
     * @param {boolean} dropWorst Whether to drop the worst people for each sensor.
     */
    async tuneAndDraw(manual = false, dropWorst = false)
    {
        // This delay may be necessary to allow the UI to update.
        await new Promise(r => setTimeout(r, 10));

        let time = this.slider.GetTime().getTime();

        DistanceCalculation.tuneXa(this.sensors, this.people, time, manual, dropWorst);

        // This delay may be necessary to allow the UI to update.
        await new Promise(r => setTimeout(r, 0));

        await this.DrawGuesses(true);
    }

    async clearXa(Xa = -5)
    {
        for (const s of this.sensors)
            s.SetPhysicalParameter(Xa);

        // This delay may be necessary to allow the UI to update.
        await new Promise(r => setTimeout(r, 0));

        await this.DrawGuesses(true);
    }

    togglePaths()
    {
        this.showPaths = !this.showPaths;
        this.showPaths ? this.timelineLayer.draw() : this.timelineLayer.clear();
    }

    async DrawGuesses(forceRecalculate = false)
    {
        this.peopleLayer.destroyChildren();
        const currentTime = this.slider.GetTime().getTime();

        if (forceRecalculate)
            this.scanTimes = this.scanTimes.filter(t => t !== currentTime);

        if (!this.scanTimes.includes(currentTime))
            await this._calculateGuesses(currentTime);

        this.people.filter(p => !p.IsHidden() && !p.IsRandomized())
            .forEach(p => p.DrawGuess(currentTime, this.sensors, this.signalLines));

        const pseudos = await Person.GetPseudoPeople(this.people, currentTime);
        pseudos.forEach(p => p.DrawGuess(currentTime, this.sensors, this.signalLines));

        this.zones.forEach(z => z.Reset());

        const countable = this.people.filter(x => !x.IsReference() && !x.IsRandomized() && x.GetGuess(currentTime));

        for (const z of this.zones)
        {
            [...countable, ...pseudos].forEach(p => z.AddHeadCount(p.GetGuess(currentTime).x, p.GetGuess(currentTime).y));
        }

        this.peopleLayer.draw();
        this.layer.draw();
        this.zoneLayer.draw();
    }

    /**
     * @private
     * @param {number} time A time value in milliseconds since midnight, January 1, 1970 UTC.
     */
    async _calculateGuesses(time)
    {
        this.scanTimes.push(time);

        const USE_MERAKI_AS_GUESS = true;

        await Person.GetPeople(this.sensors, this.people, time, this.guessLayers[0], this.peopleLayer, this.timelineLayer, this.zones, USE_MERAKI_AS_GUESS);

        this.slider.AddTick();
    }
}