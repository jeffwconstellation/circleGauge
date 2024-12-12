/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;
import IVisualHost = powerbi.extensibility.IVisualHost;
import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

export class Visual implements IVisual {
    private host: IVisualHost;
    private svg: Selection<SVGElement>;
    private container: Selection<SVGElement>;
    private circle: Selection<SVGElement>;
    private textValue: Selection<SVGElement>;
    private textLabel: Selection<SVGElement>;
    private percentageArc: Selection<SVGElement>;

    constructor(options: VisualConstructorOptions) {
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('circleCard', true);
        this.container = this.svg.append("g")
            .classed('container', true);
        this.circle = this.container.append("circle")
            .classed('circle', true);
        this.textValue = this.container.append("text")
            .classed("textValue", true);
        this.textLabel = this.container.append("text")
            .classed("textLabel", true);
        this.percentageArc = this.container.append("path")
            .classed("percentageArc", true);
    }
    private splitTextIntoLines(text: string, maxLineLength: number): string[] {
        let words = text.split(" ");
        let lines: string[] = [];
        let currentLine = "";

        words.forEach(word => {
            if ((currentLine + word).length > maxLineLength) {
                lines.push(currentLine.trim());
                currentLine = word + " ";
            } else {
                currentLine += word + " ";
            }
        });

        lines.push(currentLine.trim());
        return lines;
    }

    public update(options: VisualUpdateOptions) {
        let dataView: DataView = options.dataViews[0]
        let categoricalDataView: DataViewCategorical = dataView.categorical;

        if (<number>categoricalDataView.values[0].values[0] == null || <number>categoricalDataView.values[0].values[0] === 0) {
            this.svg.style("display", "none"); // Hide the visual
            return; // Exit early
        } else {
            this.svg.style("display", "block"); // Show the visual
        }

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        let percentage: number = <number>categoricalDataView.values[0].values[0];
        //let percentage: number = <number>0.75;
        let lowValue: number = <number>categoricalDataView.values[1].values[0] || .8; // Fallback if undefined
        let highValue: number = <number>categoricalDataView.values[2].values[0] || .9; // Fallback if undefined

        this.svg.attr("width", width);
        this.svg.attr("height", height);

        let fontSizeValue: number = Math.min(width, height) / 5.75;

        this.textValue
            .text((percentage * 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%') // Format as percentage
            .attr("x", "50%")
            .attr("y", height / 2.2 - fontSizeValue / 4) // Position above textLabel
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .style("font-size", fontSizeValue + "px")
            .style("font-family", "calibri");

        let fontSizeLabel: number = fontSizeValue / 2;

        // Split the text into multiple lines
        let textLabel: string = <string>categoricalDataView.values[3].values[0];
        let lines: string[] = this.splitTextIntoLines(textLabel, 16); // Adjust the max line length as needed

        // Remove any existing text labels
        this.container.selectAll(".textLabel").remove();

        // Add each line of text as a separate text element
        lines.forEach((line, index) => {
            this.container.append("text")
                .classed("textLabel", true)
                .text(line)
                .attr("x", "50%")
                .attr("y", height / 2.4 + fontSizeLabel / 2 + (index * fontSizeLabel)) // Adjust the y position for each line
                .attr("dy", fontSizeValue / 1.2)
                .attr("text-anchor", "middle")
                .style("font-size", fontSizeLabel + "px")
                .style("font-family", "calibri")
                .style("font-weight", "bold");
        });

        //Radius calc for cirle and arc
        let radius: number = Math.min(width, height) / 2.2;

        //Stroke size calculation
        let arcStroke: number = Math.min(width, height) * 0.06;

        this.circle
            .style("fill", "white")
            .style("fill-opacity", 0.5)
            .style("stroke", "lightgray")
            .style("stroke-width", arcStroke)
            .attr("r", radius)
            .attr("cx", width / 2)
            .attr("cy", height / 2);


        // Percentage calculation
        let startAngle = 0;
        let endAngle = (percentage) * 2 * Math.PI; // Convert percentage to radians
        let arcGenerator = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius)
            .startAngle(startAngle)
            .endAngle(endAngle);
        let strokeColor: string = "green";


        // Calculate stroke color dynamically based on the percentage and thresholds
        if (percentage < lowValue) {
            strokeColor = "red"; // Below low threshold
        } else if (percentage < highValue) {
            strokeColor = "yellow"; // Between low and high threshold
        } else {
            strokeColor = "limegreen"; // Above high threshold
        }

        this.percentageArc
            .attr("d", arcGenerator)
            .attr("transform", `translate(${width / 2}, ${height / 2})`)
            .style("fill", "none") // No fill
            .style("stroke", strokeColor) // Set stroke color
            .style("stroke-width", arcStroke); // Adjust stroke width as needed

    }
}