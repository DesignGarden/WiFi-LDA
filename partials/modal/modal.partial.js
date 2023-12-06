import { SelectedOffice } from '../../main.js';

export default class Modal
{
    static Open()
    {
        $('#modal').show();
    }

    Init()
    {
        $('.close-btn').on('click', () => $('#modal').hide());

        $(document).on('mouseup', () => this.getSelectedRows());
    }

    IsOpen()
    {
        return $('#modal').is(':visible');
    }

    getSelectedRows()
    {
        if (!this.IsOpen()) return [];

        const selectedText = window.getSelection()?.toString() ?? "";
        const regex = /([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/g;
        let macAddresses = [...new Set(selectedText.match(regex))].sort();

        if (macAddresses.length === 0) return [];

        $("#resultsTable td:first-child").filter((i, e) => macAddresses.includes($(e).text().trim()))
            .toggleClass('line-through');

        SelectedOffice.IgnoreMacs = $("#resultsTable td:first-child.line-through").map((i, e) => $(e).text().trim()).get();
    }

    static displayResultsInTable(results, TOTAL_HOURS)
    {
        const sortedData = Object.entries(results).sort((a, b) =>
        {
            const trueCountA = a[1].filter(val => val === true).length;
            const trueCountB = b[1].filter(val => val === true).length;
            return trueCountB - trueCountA;  // Sort in descending order
        }).reduce((acc, [key, val]) =>
        {
            acc[key] = val;
            return acc;
        }, {});

        const $container = $('#resultsTableContainer');
        const table = document.getElementById('resultsTable');
        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead tr');

        Modal.Open();

        // Clear previous data, if any
        while (thead.children.length > 1)
        { // keep the MAC Address header
            thead.removeChild(thead.lastChild);
        }
        while (tbody.firstChild)
        {
            tbody.removeChild(tbody.firstChild);
        }

        // Append hour headers
        for (let hour = 0; hour < TOTAL_HOURS; hour++)
        {
            const th = document.createElement('th');
            th.style.backgroundColor = Modal.getColorForHour(hour);;
            // th.textContent = `${hour + 1}`;
            thead.appendChild(th);
        }

        // Populate the table with data
        for (let mac in sortedData)
        {
            const tr = document.createElement('tr');
            const tdMac = document.createElement('td');
            tdMac.textContent = mac;
            tr.appendChild(tdMac);

            for (let hour = 0; hour < TOTAL_HOURS; hour++)
            {
                const td = document.createElement('td');
                td.textContent = results[mac][hour] ? 'x' : '';
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }

        $("#resultsTable td:first-child")
            .filter((i, e) => SelectedOffice.IgnoreMacs?.includes($(e).text().trim()))
            .toggleClass('line-through');

        $("#resultsTable td:first-child")
            .filter((i, e) => Object.keys(SelectedOffice.ReferenceMacs??{}).includes($(e).text().trim()))
            .css('font-weight', 'bold').css('text-decoration', 'none');
    }

    static getColorForHour(hour)
    {
        hour = hour % 24;
        let ratio;
        if (hour <= 12)
        {
            ratio = Math.min(hour / 8, 1);
        } else
        {
            ratio = Math.min((24 - hour) / 8, 1);
        }
        const red = Math.floor(0 + ratio * (173 - 0));
        const green = Math.floor(0 + ratio * (216 - 0));
        const blue = Math.floor(255 * ratio);
        return `rgba(${red}, ${green}, ${blue},0.5)`;
    }
}