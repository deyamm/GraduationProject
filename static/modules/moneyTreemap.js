/*
    待改善：
        1.  考虑用边框来区分不同板块
        2.  参数化设置
        3.  文字显示效果
        4.  标签事件及外观（点击定位，或重新绘制）
        5.  鼠标cover时显示资金结构（饼图）
 */
import {moneyPie} from "/static/modules/moneyPie.js";
import {curTreemapData, redraw, resizeRender} from "/static/modules/moneyBar.js";
import {drawStackBar} from "/static/modules/stackBar.js";

//颜色比例尺，传入一个参数，映射为一个颜色
var color = d3.scaleOrdinal(d3.schemeCategory10);

//将数字格式化为x,xxx形式
var format = d3.format(",d");

var widthScale, heightScale;

var centerX, centerY;

var colorUp, colorDown;

var curStackData = null;

var curTreemapParas = null;

var container = null;

function init(paras){
    curTreemapParas = paras;
    widthScale = paras.hasOwnProperty("widthScale") ? paras["widthScale"] : 0.5;
    heightScale = paras.hasOwnProperty("heightScale") ? paras["heightScale"] : 0.5;
    var d = document.getElementById("treeSvg");
    centerX = d.getBoundingClientRect().left + window.innerWidth * widthScale / 2;
    centerY = d.getBoundingClientRect().top + window.innerHeight * widthScale / 2;
    colorUp = paras.hasOwnProperty("colorUp") ? paras["colorUp"] : "#cc3300";
    colorDown = paras.hasOwnProperty("colorDown") ? paras["colorDown"] : "#00cc00";
    container = paras.hasOwnProperty("container") ? paras["container"] : null;
}



//传入数据，作出图形
export function chart(paras){
    init(paras);
    var data = paras.hasOwnProperty("data") ? paras['data'] : null;
    if(data === null){
        alert("数据缺失");
        return;
    }
    //console.log(data);
    //传入json数据，获取treemap布局数据，首先将json数据转化为树形结构（hierarchy），再生成布局
    var treemap = data => d3.treemap()
        .tile(d3.treemapSquarify)
        .size([window.innerWidth * (widthScale), window.innerHeight * (heightScale + 0.1)])
        .padding(1)
        .round(true)
        (d3.hierarchy(data)
            .sum(d => d.value * d.mark)
            .sort((a, b) => b.height - a.height || b.value - a.value));

    //获取treemap布局数据
    var root = treemap(data);
    //console.log(root);

    /*
    用鼠标移动缩放图形，当鼠标点击某个矩形时，将被点击的矩形移到屏幕中间并缩放到指定大小，
    由于d3自带的zoom利用d3.event.transform获取鼠标的事件与点击矩形的事件实现方法不同，
    即d3.event.transform的值只与滑轮与单击拖动有关，所以需要在d3.event.transform的基础上，
    添加点击矩形后重定位的问题。
    实现方法：
        preTrans:   d3.event.transform上次的结果
        curTrans:   d3.event.transform本次操作后的结果
        curPos:     在操作之前图形的transform，包括x,y,k（scale大小）
        desPos:     操作之后图形应到的位置
        desPos = curPos + curTrans - preTrans;
        当使用zoom时，改变preTrans、curTrans，并再特定情况（用flag变量来表示）下改变curPos，
        当点击某一矩形后，改变curPos

     */
    var preTrans = d3.zoomIdentity.translate(0, 0).scale(1);
    var curPos = d3.zoomIdentity.translate(0, 0).scale(1);
    var desPos = d3.zoomIdentity.translate(0 , 0).scale(1);
    var flag = 0;

    //创建整个图形的容器
    var svg = d3.select("#" + container)
        .attr("width", Math.floor($("body").width() * (widthScale)))
        .attr("height", window.innerHeight * (heightScale + 0.1))
        .style("font", "10px sans-serif")
        .style("position", "relative");
        //.style("border", "1px solid black");

    //zoom不能直接作用在svg上，直接作用在svg上移动时会出错，所以创建一个用来放置所有节点的容器
    var leafContainer = svg.append("g")
        .attr("id", "leafContainer");

    var children = leafContainer.selectAll("g")
        .data(root.children)
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    var labelContainer = svg.append("g")
        .attr("id", "labelContainer")
        .attr("transform", `translate(${window.innerWidth * widthScale * 0.05}, ${window.innerHeight * (heightScale + 0.05)})`);

    var dateLabelWidth = 200;
    var dateLabel = svg.append("g")
        .attr("id", "dateLabel")
        .attr("transform", `translate(${($("#" + container).width() - dateLabelWidth)/2}, 30)`);

    dateLabel.append("rect")
        .attr("width", dateLabelWidth)
        .attr("height", 30)
        .attr("fill", "rgba(0, 0, 0, 0.3)");

    var dateText = "".concat(paras.data.date.slice(0, 4), "-", paras.data.date.slice(4, 6), "-", paras.data.date.slice(6, 8));

    dateLabel.append("text")
        .text(dateText)
        .attr("fill", "#ffffff")
        .attr("font-size", 20)
        .attr("transform", (d, i, nodes) => `translate(${(dateLabelWidth-nodes[0].clientWidth)/2}, 20)`);

    var labels = [root.data.name];
    drawLabels(labels);

    //以root.leaves为数据创建叶子节点，节点的位置由treemap函数给出
    var leaf = children.selectAll("g")
        .data(d => d.leaves())
        .join("g")
        .attr("transform", function(d, i, nodes){
            var parX0 = nodes[i].parentElement.__data__.x0;
            var parY0 = nodes[i].parentElement.__data__.y0;
            return `translate(${d.x0 - parX0},${d.y0 - parY0})`
        });

    //每个节点的title，该内容为鼠标放置在节点上后提示的内容
    leaf.append("title")
        .text(d => `${d.ancestors().reverse().map(d => d.data.name).join("/")}\n${format(d.value * d.data.mark)}`);
        //.attr("aa", (d, i, nodes) => console.log(nodes));

    //在每个节点中添加矩形，指定属性
    leaf.append("rect")
        .attr("id", d => d.data.id)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => d.data.value > 0 ? colorUp : colorDown);
    /*
    leaf.append("clipPath")
        .attr("id", d => `clip-${d.data.id}`)
        .append("use")
        .attr("xlink:href", d => `#${d.data.id}`);
    */
    //在所有叶子节点中添加文字
    leaf.append("text")
        //.attr("clipp-path", d => `url(#clip-${d.data.id})`)
        .style("pointer-events", "none")
        .selectAll("tspan")
        //以大字母为分隔符
        .data(d => d.data.name.split(' ').concat(format(d.value*d.data.mark)))
        .enter().append("tspan")
        .attr("x", 4)
        .attr("y", (d, i) => 10 + i * 10)
        .text(d => d)
        .attr("textLen", (d, i, nodes) => nodes[i].textLength.baseVal.value + nodes[i].x.baseVal[0].value)
        /*
            每个节点文字的生成方式，当其中一行tspan的长度超过同节点下rect的宽时，将文字设为"..."
            将超出rect高度的tspan设置为null，只显示在rect范围内的文字
            也是图形进行缩放时显示方式
         */
        .text(function(d, i, nodes){
            var rectWidth = nodes[i].parentNode.previousElementSibling.width.baseVal.value;
            var rectHeight = nodes[i].parentNode.previousElementSibling.height.baseVal.value;
            if(nodes[i].y.baseVal[0].value >= rectHeight){
                return null;
            }
            for(var j = 0; j < nodes.length; j++){
                if(nodes[j].attributes["textLen"].value > rectWidth){
                    if(i === 0){
                        return "...";
                    }else{
                        return null;
                    }
                }
            }
            return d;
        })
        .text(function(d, i, nodes){
            var recWidth = nodes[i].parentNode.previousElementSibling.width.baseVal.value;
            if(nodes[i].textLength.baseVal.value + nodes[i].x.baseVal[0].value >= recWidth){
                return null;
            }
            return nodes[i].innerHTML;
        });

    var zoom = d3.zoom();

    //为整个图形添加zoom事件，start为事件发生前的动作，zoom为事件发生过程中的动作，end为发生结束后的动作
    svg.call(zoom
            //.scaleExtent([0.5, 3])
            .on("start", function(){
                //console.log(leaf.select("text").nodes(1));
                //console.log(leaf);
            })
            .on("zoom", zoomed)
            .on("end", function(){
                preTrans = d3.zoomIdentity.translate(d3.event.transform.x, d3.event.transform.y).scale(d3.event.transform.k);
                if(flag === 0) {
                    curPos = d3.zoomIdentity.translate(desPos.x, desPos.y).scale(desPos.k);
                }
                //console.log(svg.style("font"));
            }))
        //取消双击放大，该动作与点击矩形动作有冲突
        .on("dblclick.zoom", null);

    //console.log(leaf.select("rect"));

    //鼠标悬浮变亮
    leaf.selectAll("rect")
        //.attr("aaa", d => console.log(d))
        .on("mouseover", function(d){
            d3.select(this)
                .transition()
                .duration(50)
                .attr("fill", function(d){
                    //console.log(d3.color(d3.select(this).attr("fill")));
                    return d3.color(d3.select(this).attr("fill")).brighter().formatHex();
                });
            /*
            moneyPie({
                data: d.data.detail,
                transX: (d.x1 + d.x0) / 2 + curPos.x,
                transY: (d.y1 + d.y0) / 2 + curPos.y
            })
             */
        })
        .on("mouseout", function(d){
            d3.select(this)
                .transition()
                .duration(50)
                .attr("fill", d => d.data.value > 0 ? colorUp : colorDown);
            d3.select("#moneyPie").remove();
        })
        //点击矩形事件，将被点击的矩形移动到屏幕中央，并置为指定的大小
        .on("click", function(d, i, nodes){
            clickRect(d, i, nodes);
        });

    //缩放及拖动过程中事件处理
    function zoomed(){
        var curTrans = d3.event.transform;
        //指定缩放的范围
        if(curPos.k + curTrans.k - preTrans.k >= 0.5 && curPos.k + curTrans.k - preTrans.k <= 3){
            desPos = d3.zoomIdentity.translate( curPos.x + curTrans.x - preTrans.x, curPos.y + curTrans.y - preTrans.y).scale(curPos.k + curTrans.k - preTrans.k);
        }
        leafContainer.attr('transform', desPos);

        svg.style("font", `${10/desPos.k}px sans-serif`);
        labelContainer.style("font", "10px sans-serif");
        //改变文字
        leaf.selectAll("text")
            .selectAll("tspan")
            .attr("x", 4/desPos.k)
            .attr("y", (d, i) => 10/desPos.k + i * 10/desPos.k)
            .text(function(d, i, nodes){
                var rectWidth = nodes[i].parentNode.previousElementSibling.width.baseVal.value;
                var rectHeight = nodes[i].parentNode.previousElementSibling.height.baseVal.value;
                //console.log(rectWidth + " " + rectHeight);
                if(nodes[i].y.baseVal[0].value >= rectHeight){
                    return null;
                }
                for(var j = 0; j < nodes.length; j++){
                    if(parseFloat(nodes[j].attributes["textLen"].value) / desPos.k > rectWidth){
                        if(i === 0){
                            return "...";
                        }else{
                            return null;
                        }
                    }
                }
                return d;
            })
            .text(function(d, i, nodes){
                var recWidth = nodes[i].parentNode.previousElementSibling.width.baseVal.value;
                if(nodes[i].textLength.baseVal.value + nodes[i].x.baseVal[0].value >= recWidth){
                    return null;
                }
                return nodes[i].innerHTML;
            });

        flag = 0;
        //console.log(leafContainer.);
    }

    function drawLabels(labels){
        if(labelContainer.selectAll("g")._groups[0].length < labels.length){
            labelContainer.selectAll("g").data(labels).enter().append("g");
        }else{
            labelContainer.selectAll("g").data(labels).exit().remove();
        }
        var labelNodes = labelContainer.selectAll("g");
        //console.log(labelNodes);
        labelNodes.attr("transform", (d, i) => `translate(${110 * i + (window.innerWidth*widthScale*0.85-labels.length*100)/2}, 20)`)

        labelNodes.select("text").remove();
        labelNodes.select("rect").remove();

        labelNodes.append("rect")
            .attr("width", "100")
            .attr("height", "20")
            .attr("fill", "rgba(0, 0, 0, 0.3)");

        labelNodes.append("text")
            .append("tspan")
            .text(d => d)
            .attr("x", (d, i, nodes) => (nodes[i].parentNode.previousElementSibling.width.baseVal.value - nodes[i].textLength.baseVal.value)/2 )
            .attr("y", "15")
            .attr("fill", "#ffffff");
        //console.log(labelNodes);
    }

    function clickRect(d, i, nodes){
        var translateX = window.innerWidth * widthScale / 2 - (d.x0 + d.x1)/2;
        var translateY = window.innerHeight * heightScale / 2 - (d.y0 + d.y1)/2;
        //var scaleNum = targetSize / Math.min(d.x1-d.x0, d.y1-d.y0);
        leafContainer.transition()
            .duration(1000)
            .attr("transform", d3.zoomIdentity.translate(translateX, translateY).scale(1));
        curPos = d3.zoomIdentity.translate(translateX, translateY).scale(1);
        svg.transition()
            .duration(1000)
            .style("font", "10px sans-serif");
        labelContainer.style("font", "10px sans-serif");

        leaf.selectAll("text")
            .selectAll("tspan")
            .transition()
            .duration(1000)
            .attr("x", 4)
            .attr("y", (d, i) => 10 + 10 * i)
            //文字的显示方式都一样
            .text(function(td, i, nodes){
                var rectWidth = nodes[i].parentNode.previousElementSibling.width.baseVal.value;
                var rectHeight = nodes[i].parentNode.previousElementSibling.height.baseVal.value;
                //console.log(rectWidth + " " + rectHeight);
                if(nodes[i].y.baseVal[0].value >= rectHeight){
                    return null;
                }
                for(var j = 0; j < nodes.length; j++){
                    if(parseFloat(nodes[j].attributes["textLen"].value) > rectWidth){
                        if(i === 0){
                            return "...";
                        }else{
                            return null;
                        }
                    }
                }
                return td;
            })
            .text(function(d, i, nodes){
                var recWidth = nodes[i].parentNode.previousElementSibling.width.baseVal.value;
                if(nodes[i].textLength.baseVal.value + nodes[i].x.baseVal[0].value >= recWidth){
                    return null;
                }
                return nodes[i].innerHTML;
            });
        flag = 1;
        labels = nodes[i].previousElementSibling.textContent.replace(/[\r\n]/g, "/").split('/');
        labels.pop();
        drawLabels(labels);
        //console.log(d);
        var stackParas = getFormParas("stackParasSet");
        var sendData = {
            ts_code: d.data.code,
            date: d.data.date,
            stack_paras: stackParas
        };
        //console.log(d);
        $.ajax({
            url: "/stackbar/send_data",
            type: "POST",
            data: JSON.stringify(sendData),
            dataType: "json",
            success: function (data) {
                d3.select("#stackBarSvg").selectAll("g").remove();
                //window.localStorage.setItem("stackData", JSON.stringify(data));
                //window.location.href="stackbar"
                curStackData = data;
                drawStackBar({
                    code: d.data.code,
                    date: d.data.date,
                    name: d.data.name,
                    data: data["data"],
                    negative: data["negative"],
                    positive: data["positive"],
                    sum: data["net"],
                    width: d3.select("#treeSvg").attr("width"),
                    height: d3.select("#treeSvg").attr("height") * 0.6,
                    container: "stackBarSvg"
                })
            }
        })
        //console.log(leaf.select("text").select("tspan").attr("rectWidth"));
    }
}

export {curStackData, curTreemapParas};