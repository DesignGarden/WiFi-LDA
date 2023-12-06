import Konva from "Konva";

export default class Gui
{
    nextVerticalGroupX = 60;
    nextVerticalGroupY = 30;

    constructor(stage, layer)
    {
        this.stage = stage;
        this.layer = layer;
    }

    addMarker(x, y, label)
    {
        const marker = new Konva.Text({
            x, y, text: label,
            fontSize: 12,
            fontFamily: 'Calibri',
            fill: 'red',
            width: 100,
            padding: 0,
            align: 'left'
        });

        marker.on('click', () => console.log(label));
        this.layer.add(marker);

        return marker;
    }

    /**
     * 
     * @param {string} label 
     * @param {function} action 
     * @returns {Konva.Group} The button group.
     */
    addButton(label, action)
    {
        const [buttonGroup, complexText, rect] = this.addUI(this.layer, this.nextVerticalGroupX, this.nextVerticalGroupY, label);

        buttonGroup.on('click', async () =>
        {
            rect.fill('#aaa');
            this.layer.draw();

            await action(complexText);

            rect.fill('#ddd');
            this.layer.draw();
        });

        this.nextVerticalGroupY += 15;

        return buttonGroup;
    }

    AddVerticalGroup()
    {
        this.nextVerticalGroupX += 60;
        this.nextVerticalGroupY = 30;
    }

    start()
    {
    }

    /**
     * 
     * @param {Konva.Layer} layer 
     * @param {number} x 
     * @param {number} y 
     * @param {string} text 
     * @returns An array of the created Konva objects.
     */
    addUI(layer, x, y, text)
    {
        const complexText = new Konva.Text({
            x, y, text,
            fontSize: 12,
            fontFamily: 'Calibri',
            fill: '#555',
            width: 100,
            padding: 6,
            align: 'center'
        });

        const rect = new Konva.Rect({
            x, y,
            stroke: '#555',
            strokeWidth: 1,
            fill: '#ddd',
            width: 100,
            height: complexText.height(),
            shadowColor: 'black',
            shadowBlur: 3,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowOpacity: 0.2,
            cornerRadius: 2
        });

        const buttonGroup = new Konva.Group({
            x, y,
            draggable: false
        });

        buttonGroup.add(rect, complexText);
        layer.add(buttonGroup);

        return [buttonGroup, complexText, rect];
    }
}