
var height = 300;

var width = 800;

var data = null;

var margin = {top: 20, right: 20, bottom: 30, left: 0};

var curLineParas = null;

export function drawMultiLine(paras){
    curLineParas = paras;
    data = paras.hasOwnProperty("data") ? paras["data"] : null;
    if(data === null){
        alert("数据缺失");
        return;
    }
    //console.log(data);
    var container = paras.hasOwnProperty("container") ? paras["container"] : null;
    var dataType = paras.hasOwnProperty("dataType") ? paras["dataType"] : null;
    var width = paras.hasOwnProperty("width") ? paras["width"] : 800;
    d3.select("#" + container).selectAll("g").remove();
    var ylabel;
    if(dataType === null || dataType === "流入金额"){
        ylabel = "流入金额/万元";
    }else{
        ylabel = "流入量/手"
    }

    //定义x轴以及y轴的比例尺
    var x = d3.scaleBand()
        .domain(data["dates"])
        .range([margin.left, width - margin.right])
        .align([0]);

    //获取y轴数据的最大值最最小值
    var yrange = [];
    data.series.map(d => yrange.push(d3.extent(d.values)));
    //console.log(yrange);

    var y = d3.scaleLinear()
        .domain(d3.extent(yrange.flat(2)))
        .range([height - margin.bottom, margin.top*2]);

    var xTickValues = [];
    for(var i = 0; i < data.dates.length; i++){
        if(i % 5 === 0)
            xTickValues.push(data.dates[i]);
    }

    //定义x轴与y轴的坐标轴
    var xAxis = g => g
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickValues(xTickValues).tickSizeOuter(0))
        .call(function(g){
            g.selectAll(".tick").attr("transform", function(d, i, nodes){
                var transform = nodes[i].attributes.transform.nodeValue;
                var transformX = parseFloat(transform.slice(10, transform.length-1).split(",")[0]);
                return `translate(${transformX-x.bandwidth()/2}, 0)`;
            });
        });

    var yAxis = g => g
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y).ticks(8))
        //.call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(ylabel)
            .attr("x", (d, i, nodes) => -nodes[0].clientWidth*2)
            .attr("y", -10));

    //定义画线函数，该函数可以将一组数据表示为一系列点
    var line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => x(data.dates[i]))
        .y(d => y(d));

    const svg = d3.select("#"+container)
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

    svg.append("g")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    svg.append("g")
        .append("text")
        .text(paras.data.industry_name + " " + paras.data.industry_code)
        .attr("transform", (d, i, nodes) => `translate(${($("#" + container).width() - nodes[0].clientWidth)/2}, ${margin.top})`);

    //绘制拆线，通过调用line()函数，可以将一组数据绘制成一条折线
    const path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .selectAll("path")
        .data(data.series)
        .join("path")
        .style("mix-blend-mode", 'multiply')
        .attr("d", d => line(d.values));

    svg.call(hover, path);

    //拆线图的交互功能，当鼠标在图中移动时，会自动选取离鼠标在y轴上最近的线以及该线上最近的点
    function hover(svg, path){
        svg.on("mousemove", moved)
            .on("mouseenter", entered)
            .on("mouseleave", left);

        const dot = svg.append("g")
            .attr("display", "none");

        dot.append("circle")
            .attr("r", 2.5);

        dot.append("text")
            .attr("id", "curNaTa")
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle")
            .attr("y", -8);

        dot.append("text")
            .attr("id", "curDate")
            .style("font", "10px sans-serif")
            .attr("text-anchor", "middle");

        function moved(){
            d3.event.preventDefault();

            var posi = d3.event.layerX / x.bandwidth();
            var i0 = Math.floor(posi)-1;
            var i1 = i0 + 1;
            //console.log(i0);

            var ym = y.invert(d3.event.layerY);
            var xm = data.dates[i0];
            if(xm === undefined) xm = data.dates[0];
            //console.log(ym);

            var i = posi - 1 - i0 > i1 - posi + 1 ? i1 : i0;
            //console.log(i);

            var distances = [];
            data.series.map(d => distances.push(Math.abs(d.values[i] - ym)));
            var s = data.series[distances.indexOf(d3.min(distances))];
            //console.log(s);
            path.attr("stroke", d => d === s ? null : "#ddd").filter(d => d === s).raise();
            dot.attr("transform", `translate(${x(data.dates[i])}, ${y(s.values[i])})`);
            dot.select("#curNaTa").text(s.industry_name + " " + s.values[i]);
            if(xTickValues.includes(data.dates[i]) === false){
                dot.select("#curDate")
                    .attr("display", null)
                    .attr("y", (height - margin.top + 5) - y(s.values[i]))
                    .text(data.dates[i]);
            }else{
                d3.select("#curDate")
                    .attr("display", "none");
            }
        }
        function entered(){
            path.style("mix-blend-mode", null).attr("stroke", "#ddd");
            dot.attr("display", null);
        }
        function left(){
            path.style("mis-blend-mode", "multiply").attr("stroke", null);
            dot.attr("display", "none");
        }
    }
}

export {curLineParas};

