
export function moneyPie(paras){
    var data;
    if(paras.hasOwnProperty("data")){
        data = paras["data"];
    }else{
        console.log("missing data");
        return;
    }
    var width = paras.hasOwnProperty("width") ? paras["width"] : 200;
    var height = paras.hasOwnProperty("height") ? paras["height"] : 200;
    var outerRadius = paras.hasOwnProperty("outerRadius") ? paras["outerRadius"] : width / 3.0;
    var innerRadius = paras.hasOwnProperty("innerRadius") ? paras["innerRadius"] : 0;
    var transX = paras.hasOwnProperty("transX") ? paras["transX"] : 0;
    var transY = paras.hasOwnProperty("transY") ? paras["transY"] : 0;
    var colorScale = d3.scaleOrdinal()
        .domain(d3.range(data.length))
        .range(d3.schemeCategory10);

    var pieContainer = d3.select("#treeSvg")
        .append("g")
        .attr("id", "moneyPie")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", `translate(${transX}, ${transY})`);

    var pie = d3.pie();

    var piedata = pie(data);

    //弧生成器
    var arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    var gs = pieContainer.selectAll("g")
        .data(piedata)
        .join("g")
        .attr("transform", `translate(${width/2}, ${height/2})`);

    gs.append("path")
        .attr("d", d => arc(d))
        .attr("fill", (d, i) => colorScale(i));

    gs.append("text")
        .attr("transform", d => "translate(" + arc.centroid(d) +")")
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff")
        .text(d => d.data);
}