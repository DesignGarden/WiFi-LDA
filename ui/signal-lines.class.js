import Konva from "Konva";
import DiscreteProbabilityMath from "../services/discrete-probability-math.service.js";
import { SelectedOffice } from "../main.js";

export default class SignalLines
{
    constructor(stage, layer)
    {
        this.stage = stage;
        this.layer = layer;
    }

    Show(person, sensors)
    {
        this.layer.find(node => node.getType() !== 'Node').forEach(c => c.destroy());

        const targets = this.generateTargets(person, sensors);
        const connectors = this.generateConnectors(person.getNode(), targets);

        connectors.forEach(connect =>
        {
            const line = new Konva.Line({
                stroke: 'gray',
                strokeWidth: 2,
                id: connect.id,
                opacity: 0.25
            });

            const text = new Konva.Text({
                text: 'abc',
                fontSize: 12,
                fontFamily: 'Calibri',
                fill: 'gray'
            });

            this.layer.add(line);
            this.layer.add(text);

            connect.line = line;
            connect.text = text;
        });

        targets.forEach(target =>
        {
            target.x = target.node.x();
            target.y = target.node.y();

            this.updateObjects(connectors);
        });

        this.layer.draw();
    }

    Hide()
    {
        this.layer.find(node => node.getType() !== 'Node').forEach(c => c.destroy());
        this.layer.batchDraw();
    }

    generateTargets(person, sensors)
    {
        return sensors.flatMap(guideItem =>
        {
            const readings = guideItem.GetReadingsByMac(person.getMac());
            if (readings.length)
            {
                return {
                    id: `target-${readings.length}`,
                    x: guideItem.getNode().x(),
                    y: guideItem.getNode().y(),
                    node: guideItem.getNode(),
                    signal: Math.round(readings.reduce((a, b) => a + b) / readings.length)
                };
            }
            return [];
        });
    }

    generateConnectors(person, targets)
    {
        const targetFrom = {
            id: `target-${targets.length}`,
            x: person.x(),
            y: person.y(),
            node: person
        };

        return targets.map(targetTo => ({
            id: `signal-connector-${targetTo.id}`,
            from: targetFrom,
            to: targetTo,
            signal: targetTo.signal
        }));
    }

    getConnectorPoints(from, to)
    {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(-dy, dx);

        const radius = 0;

        return [
            from.x + -radius * Math.cos(angle + Math.PI),
            from.y + radius * Math.sin(angle + Math.PI),
            to.x + -radius * Math.cos(angle),
            to.y + radius * Math.sin(angle)
        ];
    }

    updateObjects(connectors)
    {
        connectors.forEach(({ text, line, from, to }) =>
        {
            text.x((
                to.node.x() - 
                from.node.x()) / 2 + 
                from.node.x());
            text.y((to.node.y() - from.node.y()) / 2 + from.node.y());

            const distance = DiscreteProbabilityMath.round(DiscreteProbabilityMath.getDistance(from.node, to.node) * SelectedOffice.PixelsToFeet, 2);
            
            text.text(`${distance}ft` + (to.signal != null?`, ${to.signal}db`: ''));

            line.points(this.getConnectorPoints(from.node.position(), to.node.position()));
        });

        this.layer.batchDraw();
    }
}