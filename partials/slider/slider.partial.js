export default class Slider
{
    constructor(htmlElement, dateHtmlElement, dateString = new Date())
    {
        this.historyDepth = 0;
        this.debounce = false;

        this.$element = $(htmlElement);
        this.$dateElement = $(dateHtmlElement);

        this.SetTime(dateString);

        this.$element
            .on('input', () =>
            {
                this.$element.trigger('change');
                htmlElement.title = this.GetTime();
            })
            .on('change', () =>
            {
                $('#time-display > span').text(this.GetTime().toString());
                if (this.debounce) return;
                this.debounce = true;
                this.onChangeHandler().then(() =>
                {
                    this.debounce = false;
                });
            });

        this.$dateElement.on('change', this.updateUrlHistory.bind(this));
    }

    updateUrlHistory()
    {
        const url = new URL(window.location);
        url.searchParams.set('date', this.GetTime());

        if (this.historyDepth === 0)
            window.history.pushState({}, '', url);
        else
            window.history.replaceState({}, '', url);

        this.historyDepth++;
    }

    AddTick()
    {
        $("#time-slider-current-time").append($("<option>").attr('value', this.$element[0].value).text(this.current));
    }

    OnChange(handler)
    {
        this.onChangeHandler = handler;
    }

    /**
     * 
     * @param {number} time 
     */
    SetTime(time)
    {
        const seconds = time instanceof Date ? time.getTime()
            : (typeof time === "string" ? new Date(time).getTime()
                : time) ?? new Date().getTime();

        this.start = new Date(seconds);
        this.start.setHours(0, 0, 0, 0);

        this.end = new Date(seconds);
        this.end.setHours(23, 59, 59, 999);

        this.current = new Date(seconds);

        this.range = this.end.getTime() - this.start.getTime();

        this.$dateElement[0].valueAsDate = this.start;

        this.$element[0].value = 100 * ((this.current.getTime() - this.start.getTime()) / this.range);
        this.$element[0].title = this.current;

        if (seconds !== this.GetTime().getTime())
            console.warn("Slider.Set() failed.", seconds, this.GetTime().getTime());
    }

    /**
     * 
     * @returns {Date} date
     */
    GetTime()
    {
        this.start.setTime(new Date(this.$dateElement[0].value).getTime());
        this.start.setHours(24, 0, 0, 0);
        const offset = this.range * (this.$element[0].value / 100);

        return new Date(offset + this.start.getTime());
    }

    GetDate()
    {
        this.start.setTime(new Date(this.$dateElement[0].value).getTime());
        this.start.setHours(24, 0, 0, 0);

        return new Date(this.start.getTime());
    }
}