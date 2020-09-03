
var margin = ({top: 50, right: 30, bottom: 50, left: 80});

var height = 300 + margin.top + margin.bottom;

var width = 800;

var disabledColor = "#DCDCDC";

var curStackParas = null;

export function drawStackBar(paras){
    curStackParas = paras;
    var data = paras.hasOwnProperty("data") ? paras["data"] : null;
    var width = paras.hasOwnProperty("width") ? paras["width"] : 800;
    var height = paras.hasOwnProperty("height") ? paras["height"] : 400;
    var container = paras.hasOwnProperty("container") ? paras["container"] : null;

    if(data === null){
        alert("数据缺失");
        return;
    }
    $("#stackSetButton").css("display", "block");
    $("#stackInfo").css("display", "block");
    $("#stackSave").css("display", "block");
    //数据类别，共有8种，分别为小、中、大、特大的流入与流出
    var categories = {};

    categories["isHidden"] = new Map();

    if(paras.hasOwnProperty("negative")){
        categories["negative"] = paras["negative"];
        for(var value of categories["negative"]){
            categories["isHidden"].set(value, 1);
        }
    }
    if(paras.hasOwnProperty("positive")){
        categories["positive"] = paras["positive"];
        for(var value of categories["positive"]){
            categories["isHidden"].set(value, 1);
        }
    }
    if(paras.hasOwnProperty("sum")){
        categories["sum"] = paras["sum"];
        for(var value of categories["positive"]){
            categories["isHidden"].set(value, 1);
        }
    }

    //数据类别对应的正负号，流出为负，流入为正
    var signs = new Map([].concat(
        categories.negative.map(d => [d, -1]),
        categories.positive.map(d => [d, 1])
    ));

    //每一行对应的起点，以0在中间，每一行对应负值的和即为每一行柱图的起点
    var bias = d3.nest()
        .key(d => d.date)
        .rollup(v => d3.sum(v, d => d.value * signs.get(d.category) < 0 ? -d.value : 0))
        .entries(data);

    var stackVal = d3.nest()
        .key(d => d.date)
        .rollup(function(v){
            var m = new Map();
            for(var j = 0; j < v.length; j++){
                m.set(v[j]["category"], v[j]["value"]);
            }
            return m;
        })
        .entries(data);

    //console.log(stackVal);

    //绘制堆栈图所需要的数据
    var series = d3.stack()
        .keys([].concat(categories.negative.slice().reverse(), categories.positive))
        .value(function(d, category){
            return signs.get(category) * (d.value.get(category) || 0);
        })
        .offset(d3.stackOffsetDiverging)
        (stackVal);

    //console.log(series);

    //x轴比例尺
    var xTop = d3.scaleLinear()
        .domain(d3.extent(series.flat(2)))
        .rangeRound([margin.left, width - margin.right]);

    //y轴比例尺
    var y = d3.scaleBand()
        .domain(bias.map(x => x.key))
        .rangeRound([margin.top*2, height - margin.bottom])
        .padding(2 / 33);

    //颜色比例尺
    var color = d3.scaleOrdinal()
        .domain([].concat(categories.positive.slice().reverse(), categories.negative.slice().reverse()))
        .range(d3.schemeRdYlGn[categories.negative.length + categories.positive.length]);
    //console.log(xTop(0));
    //x轴坐标轴
    var xTopAxis = g => g
        .attr("transform", `translate(0, ${margin.top*2})`)
        .call(d3.axisTop(xTop)
            .ticks(width / 80)
            .tickSizeOuter(0))
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
            .attr("x", xTop(0) + 20)
            .attr("y", -24)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start"))
        .call(g => g.append("text")
            .attr("x", xTop(0) - 20)
            .attr("y", -24)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end"));

    //y轴坐标轴
    var yAxis = g => g
        .call(d3.axisLeft(y).tickSizeOuter(0))
        .call(g => g.selectAll(".tick").data(bias)
            //.attr("aaa", d => console.log(y(d.key)))
            .attr("transform", d => `translate(${xTop(d.value)},${y(d.key) + y.bandwidth() / 2})`))
        .call(g => g.select(".domain").attr("transform", `translate(${xTop(0)},0)`));

    var svg = d3.select("#" + container)
        .style("width", width + "px")
        .style("height", height + "px");

    var mousePos = [0, 0];

    svg.on("mousemove", function(){
        mousePos = d3.mouse(this);
    });

    var yHeight;
    if(categories.hasOwnProperty("sum")){
        yHeight = y.bandwidth() / 2;
    }else{
        yHeight = y.bandwidth();
    }

    //为series中每个元素绘制矩形
    var bars = svg.append("g")
        .selectAll("g")
        .data(series)
        .join("g")
        .selectAll("rect")
        .data(d => d.map(v => Object.assign(v, {key: d.key})))
        .join("rect")
        .attr("class", "heightDynamic")
        .attr("fill", d => color(d.key))
        .attr("x", d => xTop(d[0]))
        .attr("y", d => y(d.data.key))
        .attr("height", yHeight);

    bars.transition()
        .attr("width", d => xTop(d[1]) - xTop(d[0]));

    //如果数据中有可选数据，即资金的净流入，则会在原图基础上绘制可选数据的矩形
    if(categories.hasOwnProperty("sum")){

        var sumColor = d3.scaleOrdinal()
        .domain(categories.sum)
        .range(d3.schemeBrBG[categories.sum.length]);

        drawSumBar(categories["sum"]);

        svg.append("g")
            .attr("id", "sumLegend");

        var sumLegend = drawLegends({
            columns: categories.sum,
            color: sumColor,
            parentContainer: container,
            container: "sumLegend",
            offsetX: 0,
            offsetY: height - margin.bottom/2,
            textLen: 60
        });

        sumLegend.on("click", function(d, i, nodes){
            d3.selectAll(".redraw").remove();
            if(nodes[i].children[0].attributes.fill.value !== disabledColor){
                nodes[i].children[0].attributes.fill.value = disabledColor;
                nodes[i].children[1].attributes.fill.value = disabledColor;
                var cates = [];
                for(var j = 0; j < nodes.length; j++){
                    if(nodes[j].children[0].attributes.fill.value !== disabledColor){
                        cates.push(nodes[j].children[1].children[0].innerHTML);
                    }
                }
                if(cates.length > 0){
                    drawSumBar(cates);
                }else{
                    d3.selectAll(".heightDynamic")
                        .transition()
                        .attr("height", y.bandwidth());
                }
            }else{
                nodes[i].children[0].attributes.fill.value = color(d);
                nodes[i].children[1].attributes.fill.value = "#000000";
                var cates = [];
                for(var j = 0; j < nodes.length; j++){
                    if(nodes[j].children[0].attributes.fill.value !== disabledColor){
                        cates.push(nodes[j].children[1].children[0].innerHTML);
                    }
                }
                if(cates.length === 1){
                    d3.selectAll(".heightDynamic")
                        .transition()
                        .attr("height", y.bandwidth()/2);
                }
                drawSumBar(cates);
            }
        });
    }
    /*
    bars.append("title")
        .text(d => `${d.data.key} ${categories["nameMap"].get(d.key)} ${signs.get(d.key) * d.data.value.get(d.key)}`);
    */

    svg.append("g")
        .call(xTopAxis);

    svg.append("g")
        .call(yAxis);

    //用于显示鼠标悬停矩形的信息
    svg.append("g")
        .attr("id", "infoWin")
        .style("visibility", "hidden")
        .style("font", "15px sans-serif")
        .append("rect")
        .attr("pointer-events", "none")
        .attr("fill", "rgba(0, 0, 0, 0.4)")
        .attr("width", 140)
        .attr("height", 70);


    bars.on("mouseover", function(d, i, nodes){
            d3.select(this)
                .transition()
                .duration(50)
                .attr("fill", d3.color(d3.select(this).attr("fill")).brighter().formatHex());
            overEvent(d, i, nodes);
        })
        .on("mouseout", function(d, i, nodes){
            d3.select(this)
                .transition()
                .duration(50)
                .attr("fill", t => color(t.key));
            outEvent(d, i, nodes);
        });

    svg.append("g")
        .attr("id", "legend");

    var legends = drawLegends({
        columns: [].concat(categories.negative, categories.positive),
        color: color,
        parentContainer: container,
        container: "legend",
        offsetY: margin.top
    });

    var graphLabel = svg.append("g")
        .attr("width", $("#" + container).width());

    graphLabel.append("text")
        //.attr("a", (d, i, nodes) => console.log(nodes[0].clientWidth))
        .text(paras.name + " " + paras.code + "  资金流/万元")
        .attr("transform", (d, i, nodes) => `translate(${($("#" + container).width()-nodes[0].clientWidth)/2}, ${margin.top/2})`);


    /*
    legends.on("click", function(d, i, nodes){
        if(nodes[i].children[0].attributes.fill.value !== disabledColor){
            nodes[i].children[0].attributes.fill.value = disabledColor;
            nodes[i].children[1].attributes.fill.value = disabledColor;

        }else{
            nodes[i].children[0].attributes.fill.value = color(d);
            nodes[i].children[1].attributes.fill.value = "#000000";

        }
    });
     */

    function overEvent(d, i, nodes){
        d3.select("#infoWin")
            .attr("transform", `translate(${mousePos[0]},${mousePos[1]})`)
            .style("visibility", "visible")
            .append("text")
            .attr("fill", "#ffffff")
            .selectAll("tspan")
            .data([d.data.key, d.key, d.data.value.get(d.key)])
            .enter().append("tspan")
            .attr("x", 4)
            .attr("y", (d, i) => 20 + 20 * i)
            .text(d => d);
    }

    function outEvent(d, i, nodes){
        d3.select("#infoWin")
            .style("visibility", "hidden")
            .select("text")
            .remove();
    }

    function drawSumBar(sumCategories){

        var sumSeries = d3.stack()
            .keys(sumCategories)
            .value(function(d, category){
                return d.value.get(category) || 0;
            })
            .offset(d3.stackOffsetDiverging)
            (stackVal);
        var range = d3.extent(sumSeries.flat(2));
        var maxV = Math.max(Math.abs(range[0]), Math.abs(range[1]));
        var xBottom = d3.scaleLinear()
            .domain([-maxV, maxV])
            .rangeRound([margin.left, width - margin.right]);

        var xBottomAxis = g => g
            .attr("class", "redraw")
            .attr("transform", `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(xBottom)
                .ticks(6)
                .tickSizeOuter(0))
            .call(g => g.select(".domain").remove())
            .call(g => g.append("text")
                .attr("x", xBottom(0) + 20)
                .attr("y", -24)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start"))
            .call(g => g.append("text")
                .attr("x", xBottom(0) - 20)
                .attr("y", -24)
                .attr("fill", "currentColor")
                .attr("text-anchor", "end"));

        var sumBars = svg.append("g")
            .attr("class", "redraw")
            .selectAll("g")
            .data(sumSeries)
            .join("g")
            .selectAll("rect")
            .data(d => d.map(v => Object.assign(v, {key: d.key})))
            .join("rect")
            .attr("fill", d => sumColor(d.key))
            .attr("x", d => xBottom(d[0]))
            .attr("y", d => yHeight + y(d.data.key))
            .attr("height", yHeight);

        sumBars.transition()
            .attr("width", d => xBottom(d[1]) - xBottom(d[0]));

        svg.append("g")
            .call(xBottomAxis);

        sumBars
            .on("mouseover", function(d, i, nodes){
                d3.select(this)
                    .transition()
                    .duration(50)
                    .attr("fill", d3.color(d3.select(this).attr("fill")).brighter().formatHex());
                overEvent(d, i, nodes);
            })
            .on("mouseout", function(d, i, nodes){
                d3.select(this)
                    .transition()
                    .duration(50)
                    .attr("fill", t => sumColor(t.key));
                outEvent(d, i, nodes);
            })
    }
}

export {curStackParas};