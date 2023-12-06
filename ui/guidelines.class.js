import Konva from "Konva";

export default class GuideLines
{
    GUIDELINE_OFFSET = 2;

    constructor(stage, layer)
    {
        this.stage = stage;
        this.layer = layer;
    }

    getLineGuideStops(skipShape)
    {
        const vertical = [0, this.stage.width() / 2, this.stage.width()];
        const horizontal = [0, this.stage.height() / 2, this.stage.height()];

        this.stage.find('.object').forEach(guideItem =>
        {
            if (guideItem === skipShape) return;

            const box = guideItem.getClientRect();
            vertical.push(box.x, box.x + box.width, box.x + box.width / 2);
            horizontal.push(box.y, box.y + box.height, box.y + box.height / 2);
        });

        return {
            vertical,
            horizontal
        };
    }

    getObjectSnappingEdges(node)
    {
        const box = node.getClientRect();

        const verticalEdges = ['start', 'center', 'end'].map((snap, i) =>
        {
            const guide = [box.x, box.x + box.width / 2, box.x + box.width][i];
            const offset = [node.x() - box.x, node.x() - box.x - box.width / 2, node.x() - box.x - box.width][i];

            return {
                guide: Math.round(guide),
                offset: Math.round(offset),
                snap
            };
        });

        const horizontalEdges = ['start', 'center', 'end'].map((snap, i) =>
        {
            const guide = [box.y, box.y + box.height / 2, box.y + box.height][i];
            const offset = [node.y() - box.y, node.y() - box.y - box.height / 2, node.y() - box.y - box.height][i];

            return {
                guide: Math.round(guide),
                offset: Math.round(offset),
                snap
            };
        });

        return {
            vertical: verticalEdges,
            horizontal: horizontalEdges
        };
    }

    getGuides(lineGuideStops, itemBounds)
    {
        const checkGuides = (lineGuides, itemBounds) =>
        {
            return lineGuides.reduce((acc, lineGuide) =>
            {
                itemBounds.forEach(itemBound =>
                {
                    const diff = Math.abs(lineGuide - itemBound.guide);
                    if (diff < this.GUIDELINE_OFFSET)
                    {
                        acc.push({
                            lineGuide,
                            diff,
                            snap: itemBound.snap,
                            offset: itemBound.offset
                        });
                    }
                });

                return acc;
            }, []);
        };

        const resultV = checkGuides(lineGuideStops.vertical, itemBounds.vertical);
        const resultH = checkGuides(lineGuideStops.horizontal, itemBounds.horizontal);

        return [
            ...resultV.sort((a, b) => a.diff - b.diff).slice(0, 1).map(res => ({ ...res, orientation: 'V' })),
            ...resultH.sort((a, b) => a.diff - b.diff).slice(0, 1).map(res => ({ ...res, orientation: 'H' }))
        ];
    }

    drawGuides(guides)
    {
        guides.forEach(({ orientation, lineGuide }) =>
        {
            const line = new Konva.Line({
                points: orientation === 'H' ? [-6000, lineGuide, 6000, lineGuide] : [lineGuide, -6000, lineGuide, 6000],
                stroke: 'rgb(0, 161, 255)',
                strokeWidth: 1,
                name: 'guid-line',
                dash: [4, 6]
            });

            this.layer.add(line);
        });

        this.layer.batchDraw();
    }

    start()
    {
        this.stage.on('dragmove', e =>
        {
            this.layer.find('.guid-line').forEach(x => x.destroy());

            const lineGuideStops = this.getLineGuideStops(e.target);
            const itemBounds = this.getObjectSnappingEdges(e.target);
            const guides = this.getGuides(lineGuideStops, itemBounds);

            if (guides.length)
            {
                this.drawGuides(guides);

                guides.forEach(({ snap, orientation, lineGuide, offset }) =>
                {
                    if (['start', 'center', 'end'].includes(snap))
                    {
                        if (orientation === 'V') e.target.x(lineGuide + offset);
                        else e.target.y(lineGuide + offset);
                    }
                });
            }
        });

        this.stage.on('dragend', () =>
        {
            this.layer.find('.guid-line').forEach(x => x.destroy());
            this.layer.batchDraw();
        });
    }
}