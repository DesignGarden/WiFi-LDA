import Konva from "Konva";
import DiscreteProbabilityMath from "../services/discrete-probability-math.service.js";

export default class DistanceLines
{
    constructor(stage, layer)
    {
        this.stage = stage;
        this.layer = layer;
    }

    start()
    {
        this.stage.on('dragmove', () =>
        {
            this.layer.find(node => node.getType() !== 'Node').forEach(c => c.destroy());

            const targets = this.generateTargets();
            const connectors = this.generateConnectors(targets);

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

                this.layer.add(line, text);

                connect.line = line;
                connect.text = text;
            });

            targets.forEach(() => this.updateObjects(connectors));
        });

        this.stage.on('dragend', () =>
        {
            this.layer.find(node => node.getType() !== 'Node').forEach(c => c.destroy());
            this.layer.batchDraw();
        });
    }

    generateTargets()
    {
        const targets = [];
        ['.person', '.sensor'].forEach(selector =>
        {
            this.stage.find(selector).forEach(guideItem =>
            {
                targets.push({
                    id: `target-${targets.length}`,
                    x: guideItem.x(),
                    y: guideItem.y(),
                    node: guideItem
                });
            });
        });
        return targets;
    }

    generateConnectors(targets)
    {
        const result = [];
        targets.forEach(targetFrom =>
        {
            const from = targetFrom.id;
            targets.forEach(targetTo =>
            {
                const to = targetTo.id;
                if (from !== to)
                {
                    result.push({
                        id: `connector-${result.length}`,
                        from: targetFrom,
                        to: targetTo
                    });
                }
            });
        });
        return result;
    }

    getConnectorPoints({ x: fromX, y: fromY }, { x: toX, y: toY })
    {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(-dy, dx);
        const radius = 0;
        return [
            fromX + -radius * Math.cos(angle + Math.PI),
            fromY + radius * Math.sin(angle + Math.PI),
            toX + -radius * Math.cos(angle),
            toY + radius * Math.sin(angle)
        ];
    }

    updateObjects(connectors)
    {
        connectors.forEach(({ text, line, from, to, signal }) =>
        {
            const { node: fromNode } = from;
            const { node: toNode } = to;

            text.position({
                x: (toNode.x() - fromNode.x()) / 2 + fromNode.x(),
                y: (toNode.y() - fromNode.y()) / 2 + fromNode.y()
            });

            const distance = DiscreteProbabilityMath.round(DiscreteProbabilityMath.getDistance(fromNode, toNode), 2);
            text.text(`${distance}px` + (signal != null ? `, ${signal}` : ''));

            line.points(this.getConnectorPoints(fromNode.position(), toNode.position()));
        });
        this.layer.batchDraw();
    }
}