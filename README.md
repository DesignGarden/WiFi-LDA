# Wifi Location-Based Services (LBS) Calculation Demo

## Overview

This project demonstrates a Wifi Location-Based Services (LBS) system, providing a platform to visualize and calculate wireless signal-based location tracking within a defined area (like an office). It utilizes various technologies including JavaScript, Konva.js for canvas-based rendering, and jQuery for DOM manipulations.

### Front-End Only
Note that this is only the front-end code for the WiFi LDA. You will have to craft an ingest and reporting API for your WiFi data, then edit the api.service.js accordingly.

## Features

- **Sensor and Zone Management**: Add and manage sensors and zones within a virtual environment.
- **Signal Processing**: Capture and process Wifi signals for location determination.
- **Real-time Visualization**: Display real-time signal strengths and estimated locations on a graphical interface.
- **Historical Data Analysis**: Analyze and display historical data for signal strength and locations.
- **BACNET Integration**: Capability to integrate with BACNET systems for building management.
- **CSV Data Export**: Export collected data in CSV format for external analysis.
- **User Interface Customizations**: Interactive GUI allowing dynamic interactions with the system.

## Prerequisites

- A modern web browser.
- Basic understanding of JavaScript and web technologies.
- Access to a reporting API that contains the WiFi data.

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/DesignGarden/WiFi-LDA.git
   ```

2. Navigate to the project directory:

   ```sh
   cd WiFi-LDA
   ```

3. Open the `index.html` file in a web browser.

## Usage

- **Adding Sensors and Zones**: Utilize the GUI to add sensors and define zones in the application.
- **Signal Capturing**: The system will automatically capture and process Wifi signals.
- **Data Analysis**: Use the provided tools in the GUI to analyze signal data.
- **Exporting Data**: Export the captured data in CSV format for further analysis.

## Configuration

1. Edit the configuration settings in the `main.js` file to set up the application according to your environment. This includes setting up the reporting server, office layout, and other relevant settings.
2. Use the GUI to create your layout, then save the output JSON to the example.office.json.

## Contributing

Contributions to this project are welcome. Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the Konva.js team for their powerful canvas rendering library.
- Appreciation to the contributors and maintainers of jQuery.