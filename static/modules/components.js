import {resizeRender, redraw, color, curTreemapData} from '/static/modules/moneyBar.js';
import {chart, curStackData} from '/static/modules/moneyTreemap.js';
import {drawStackBar} from "/static/modules/stackBar.js";
import {drawMultiLine, curLineParas} from "/static/modules/multiLine.js";

//var columns = localStorage.getItem('columns').split(",");

/*
    鼠标拖动改变两个图的宽度

 */
var resizeSlider = document.getElementById("resize");

resizeSlider.addEventListener('mousedown', function(event){
    document.addEventListener('mousemove', resize, false);
    }, false);

document.addEventListener('mouseup', function(event){
    document.removeEventListener('mousemove', resize, false);
    }, false);


function resize(event){
    var scale = event.clientX / window.innerWidth;
    if(scale > 0.3 && scale < 0.7){
        $("#canvas-frame").css("width", event.clientX + "px");
        resizeRender(event.clientX / window.innerWidth);
        var s = document.getElementById("treeSvg");
        while(s.hasChildNodes()){
            s.removeChild(s.firstChild);
        }
        var chartWidth = $("body").width() - $("#canvas-frame").outerWidth() - $("#resize").outerWidth() - 2;
        chart({
            data: curTreemapData,
            widthScale: chartWidth / $("body").width(),
            heightScale: 0.5,
            container: "treeSvg"
        });
        d3.select("#stackBarSvg").selectAll("g").remove();
        if(curStackData !== null){
            drawStackBar({
                data: curStackData["data"],
                negative: curStackData["negative"],
                positive: curStackData["positive"],
                sum: curStackData["net"],
                width: d3.select("#treeSvg").attr("width"),
                height: d3.select("#treeSvg").attr("height") * 0.6,
                container: "stackBarSvg"
            });
        }
        var numPerRow = Math.floor($("#canvas-frame").width() / 100);
        d3.select("#legendSvg")
            .selectAll("g")
            .attr("transform", function(d, i, nodes){
                var row = Math.floor(i / numPerRow);
                var numThisRow = nodes.length - row * numPerRow > numPerRow ? numPerRow : nodes.length - row * numPerRow;
                var startPos = ($("#canvas-frame").width() - numThisRow * 100) / 2;
                return `translate(${startPos + i % numThisRow * 100}, ${row * 40})`;
            });
        curLineParas["width"] = $("#multiLineDiv").width()*0.8;
        drawMultiLine(curLineParas);
    }
}

