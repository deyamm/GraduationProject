
//进入页面时调整一些元素的尺寸
function setSize(barWidScale, treeWidScale) {
    $("#resize").css("height", String(window.innerHeight) + "px");
    //$("#canvas-frame").css("left", String((1-barWidScale-treeWidScale-0.03)/2 * window.innerWidth) + "px");
    $("#container").css("width", String(window.innerWidth * barWidScale * 0.9) + "px");
    $("#container").css("left", String(window.innerWidth * barWidScale * 0.05) + "px");
    $("#canvas-frame").css("width", String(window.innerWidth * barWidScale) + "px");
    $("#lineL1").attr("disabled", "disabled");
    $("#lineIndustryLevel").get(0).selectedIndex = 1;
}


function getPos(array, index) {
    var res = 0;
    for (var i = 0; i < index; i++) {
        array[i] === 1 ? res++ : null;
    }
    return res;
}


//绘制图例函数，传入相应的参数来在指定位置绘制指定内容的图例
function drawLegends(paras) {
    var columns = paras.hasOwnProperty("columns") ? paras["columns"] : null;
    var color = paras.hasOwnProperty("color") ? paras["color"] : null;
    var parentContainer = paras.hasOwnProperty("parentContainer") ? paras["parentContainer"] : null;
    var container = paras.hasOwnProperty("container") ? paras["container"] : null;
    var offsetX = paras.hasOwnProperty("offsetX") ? paras["offsetX"] : 0;
    var offsetY = paras.hasOwnProperty("offsetY") ? paras["offsetY"] : 0;
    var rectWidth = paras.hasOwnProperty("rectWidth") ? paras["rectWidth"] : 40;
    var rectHeight = paras.hasOwnProperty("rectHeight") ? paras["rectHeight"] : 20;
    var textLen = paras.hasOwnProperty("textLen") ? paras["textLen"] : 55;
    var fontSize = paras.hasOwnProperty("fontSize") ? paras["fontSize"] : 13;

    var unitLen = (rectWidth + textLen) + 5;

    var parent = $(`#${parentContainer}`);
    var numPerRow = Math.floor(parent.width() / unitLen);
    //console.log(numPerRow);
    var legends = d3.select(`#${container}`)
        .style("width", parent.width())
        .style("font", fontSize + "px sans-serif")
        .selectAll("g")
        .data(columns)
        .join("g")
        .attr("transform", function (d, i) {
            var row = Math.floor(i / numPerRow);
            var numThisRow = columns.length - row * numPerRow > numPerRow ? numPerRow : columns.length - row * numPerRow;
            var startPos = (parent.width() - numThisRow * 100) / 2;
            //console.log(`${row} ${numThisRow} ${startPos}`);
            return `translate(${offsetX + startPos + i % numThisRow * unitLen}, ${offsetY + row * 1.5 * rectHeight})`;
        });
    //添加填充的矩形
    legends.append("rect")
        .attr("width", rectWidth)
        .attr("height", rectHeight)
        .style("cursor", "pointer")
        .attr("fill", d => color(d));
    //添加文字
    legends.append("text")
        .attr("fill", "#000000")
        .append("tspan")
        .attr("x", rectWidth)
        .attr("y", rectHeight - (rectHeight - fontSize) / 2)
        .attr("textLength", textLen)
        .text(d => d);

    return legends;
}

//用于处理网页中按钮等组件的一部分点击事件，比如设置参数栏位置等，
function setParasEvent() {

    var treemapParasSet = $("#treemapParasSet");
    var stackParasSet = $("#stackParasSet");
    var barParasSet = $("#barParasSet");
    var lineParasSet = $("#lineParasSet");
    var colorPicker = $("#colorPicker");

    var curParasSet = null;

    $("#barSetButton").click(function () {
        curParasSet = getFormParas("barParasSet");
        treemapParasSet.animate({
            top: "-300px"
        }, "fast");
        stackParasSet.css("display", "none");
        barParasSet.animate({
            left: 0
        }, "fast");
        lineParasSet.animate({
            left: "-200px"
        }, "fast");
    });
    $("#barOkButton").click(function () {
        var lineIndustryLevel = $("#lineIndustryLevel");
        barParasSet.animate({
            left: "-200px"
        }, "fast");
        var curBarLevel = getFormParas("barParasSet")["industryLevel"];
        console.log(getFormParas("barParasSet"));
        lineIndustryLevel.each(function(){
            $(this).removeAttr("disabled");
        });
        lineIndustryLevel.get(0).selectedIndex = 0;
        if(curBarLevel === "L1"){
            $("#lineL1").attr("disabled", "disabled");
            lineIndustryLevel.get(0).selectedIndex = 1;
        }else if(curBarLevel === "L2"){
            $("#lineL1").attr("disabled", "disabled");
            $("#lineL2").attr("disabled", "disabled");
            lineIndustryLevel.get(0).selectedIndex = 2;
        }else{
            $("#lineL1").attr("disabled", "disabled");
            $("#lineL2").attr("disabled", "disabled");
            $("#lineL3").attr("disabled", "disabled");
            lineIndustryLevel.get(0).selectedIndex = 3;
        }

    });
    $("#barCancelButton").click(function(){
        barParasSet.animate({
            left: "-200px"
        }, "fast");
        resetForm("barParasSet", curParasSet);
    });

    $("#treemapSetButton").click(function () {
        curParasSet = getFormParas("treemapParasSet");
        barParasSet.animate({
            left: "-200px"
        }, "fast");
        stackParasSet.css("display", "none");
        treemapParasSet.animate({
            top: "100px"
        }, "fast");
        lineParasSet.animate({
            left: "-200px"
        }, "fast");
    });
    $("#treemapOkButton").click(function () {
        treemapParasSet.animate({
            top: "-300px"
        }, "fast");
        //$("#treemapParasSet").css("display", "none");
    });
    $("#treemapCancelButton").click(function(){

        treemapParasSet.animate({
            top: "-300px"
        }, "fast");
        resetForm("treemapParasSet", curParasSet);
    });

    $("#stackSetButton").click(function () {
        curParasSet = getFormParas("stackParasSet");
        treemapParasSet.animate({
            top: "-300px"
        }, "fast");
        barParasSet.animate({
            left: "-200px"
        }, "fast");
        stackParasSet.css("display", "block");
        lineParasSet.animate({
            left: "-200px"
        }, "fast");
    });
    $("#stackOkButton").click(function () {
        stackParasSet.css("display", "none");
    });
    $("#stackCancelButton").click(function(){

        stackParasSet.css("display", "none");
        resetForm("stackParasSet", curParasSet);
    });

    $("#lineSetButton").click(function () {
        curParasSet = getFormParas("lineParasSet");
        lineParasSet.animate({
            left: 0
        }, "fast");
        barParasSet.animate({
            left: "-200px"
        }, "fast");
        treemapParasSet.animate({
            top: "-300px"
        }, "fast");
        stackParasSet.css("display", "none");
    });
    $("#lineOkButton").click(function () {
        lineParasSet.animate({
            left: "-200px"
        }, "fast");
    });
    $("#lineCancelButton").click(function(){

        lineParasSet.animate({
            left: "-200px"
        }, "fast");
        resetForm("lineParasSet", curParasSet);
    });

    $("#barInfo").popover({
        trigger: "click",
        placement: "bottom",
        title: "功能说明",
        html: true,
        content: barIntro(),
    });
    $("#lineInfo").popover({
        trigger: "click",
        placement: "bottom",
        title: "功能说明",
        html: true,
        content: lineIntro(),
    });
    $("#treemapInfo").popover({
        trigger: "click",
        placement: "bottom",
        title: "功能说明",
        html: true,
        content: treemapIntro(),
    });
    $("#stackInfo").popover({
        trigger: "click",
        placement: "bottom",
        title: "功能说明",
        html: true,
        content: stackIntro(),
    });

    colorPicker.colorpicker();
    colorPicker.on('change', function (event) {
        var curColor = event.target.value;
        //console.log(curColor);
        colorPicker.css('background-color', curColor.toString()).val('');
        $("#colorValue").val(curColor.toString());
    });

}

//根据3D柱状图参数栏的内容以及原3D柱状图的参数来获得新的数据
function setBarParas(curParas){
    //console.log("bar");
    var formParas = getFormParas("barParasSet");
    var paras = curParas;
    if(formParas["dataType"] === "流入金额"){
        paras["zlabel"] = "流入金额/万元";
    }else{
        paras["zlabel"] = "流入量/手"
    }
    if(formParas["startIndex"] === ''){
        formParas["startIndex"] = '0';
    }
    if(formParas["endIndex"] === ''){
        formParas["endIndex"] = '5';
    }
    if(parseInt(formParas["startIndex"]) > parseInt(formParas["endIndex"])){
        var t = formParas["startIndex"];
        formParas["startIndex"] = formParas["endIndex"];
        formParas["endIndex"] = t;
    }
    $("#startIndex").val(formParas["startIndex"]);
    $("#endIndex").val(formParas["endIndex"]);
    //console.log(curParas);
    $.ajax({
        type: "POST",
        url: "/bar/bar_paras",
        data: JSON.stringify(formParas),
        dataType: "json",
        async: false,
        success: function(data){
            paras["xData"] = data["columns"];
            paras["yData"] = data["index"];
            paras["zData"] = data["sum"];
            paras["codes"] = data["codes"];
        }
    });
    return paras;
    //console.log($("#barParasSet").serializeArray());
}

//根据折线图在参数栏与3D柱状图参数栏内容以及原折线图参数来获取新的数据
function setLineParas(curLineParas){
    var lineParas = getFormParas("lineParasSet");
    var barParasSet = getFormParas("barParasSet");
    var newParas = curLineParas;
    newParas["dataType"] = lineParas["dataType"];
    //console.log(curLineParas);
    $.ajax({
        type: "POST",
        url: "/bar/line_data",
        data: JSON.stringify({
            industry_level: barParasSet["industryLevel"],
            industry_name: curLineParas["data"]["industry_name"],
            industry_code: curLineParas["data"]["industry_code"],
            line_paras: lineParas,
            start_date: '20200101',
            end_date: '20200201'
        }),
        dataType: "json",
        async: false,
        success: function(data){
            newParas["data"] = data;
        }
    });
    return newParas;
}

//根据矩形树图参数栏内容及其原参数来获取新的数据
function setTreemapParas(curTreemapData){
    var treemapParas = getFormParas("treemapParasSet");
    //console.log($("#barParasSet").serializeArray());
    var sendData = {
        industry_name: curTreemapData["industry_name"],
        industry_code: curTreemapData["industry_code"],
        date: curTreemapData["date"],
        treemapParas: treemapParas
    };
    var paras = curTreemapData["paras"];
    console.log(paras);
    $.ajax({
        type: "POST",
        url: "/bar/treemap_data",
        data: JSON.stringify(sendData),
        dataType: "json",
        async: false,
        success: function(data){
            paras["data"] = data;
        }
    });
    return paras;
}

//根据堆叠柱状图参数栏内容及其原参数来获取新的数据
function setStackParas(curStackParas){
    var stackParas = getFormParas("stackParasSet");
    var newParas = curStackParas;
    $.ajax({
        type: "POST",
        url: "/stackbar/send_data",
        data: JSON.stringify({
            ts_code: curStackParas["code"],
            date: curStackParas["date"],
            stack_paras: stackParas
        }),
        dataType: "json",
        async: false,
        success: function(data){
            newParas["data"] = data["data"];
        }
    });
    return newParas;
}

//获取字典形式的参数栏内容，serializeArray()返回的是数组形式的内容，不利于操作
function getFormParas(id){
    var formValue = $(`#${id}`).serializeArray();
    var formParas = {};
    for(var i = 0; i < formValue.length; i++){
        formParas[formValue[i]["name"]] = formValue[i]["value"];
    }
    return formParas;
}

//4个函数分别用于返回4个模型的操作指导
function barIntro(){
    return "1. 使用鼠标来移动、缩放、旋转图形；<br>" +
        "2. 点击柱体绘制矩形树图以及折线图；<br>" +
        "3. 悬停在柱体上获取详细数据<br>" +
        "4. 拖动下方滑动条来显示指定范围内数据；<br>" +
        "5. 点击图例来隐藏或显示指定的数据；<br>" +
        "6. 点击“设置”按钮来调整参数。";
}

function lineIntro(){
    return "1. 移动鼠标来查看详细数据；<br>" +
        "2. 点击“设置”按钮来调整参数。";
}

function treemapIntro(){
    return "1. 移动鼠标来移动、缩放图形；<br>" +
        "2. 悬停在矩形上获取详细数据；<br>" +
        "3. 点击矩形来获得堆叠柱状图；<br>" +
        "4. 点击”设置“按钮来调整参数。";
}

function stackIntro(){
    return "1. 悬停在矩形上获取详细数据；<br>" +
        "2. 点击下方图例来隐藏或显示相应的数据；<br>" +
        "3. 点击”设置“按钮来调整参数。";
}

//4个函数分别用于向服务器发送请求，用于下载对应数据
function barSaveClick(data){
    downloadData(data, "barData");
}

function lineSaveClick(data){
    downloadData(data, "lineData");
}

function treemapSaveClick(data){
    downloadData(data, "treemapData");
}

function stackSaveClick(data){
    downloadData(data, "stackbarData");
}

//用于下载数据的函数，该函数先向服务器发送请求，服务器会将指定内容生成文件，该函数再利用a标签来下载文件
function downloadData(data, filename){
    $.ajax({
        type: "POST",
        url: "/file/save",
        data: JSON.stringify({
            data: data,
            filename: filename
        }),
        dataType: "json",
        async: false,
        success: function(data){
            if(data.status === 'success'){
                var link = document.createElement("a");
                $(link).attr("href", "/static/tmp/" + data.filename);
                $(link).attr("download", data.filename);
                link.click();
                link.remove();
            }
        }
    })
}

//当点击“取消”按钮时，需要将已经修改的内容恢复为修改前的内容。
// 方法为在点击“设置”按钮时，该脚本会记录下修改前的内容，点击“取消”后，会将各个表单内容置为修改前的内容
function resetForm(formId, curParasSet){
    $(`form[id=${formId}] select`).each(function(){
        var name = $(this).context.attributes.name.value;
        $(this).val(curParasSet[name]);
    });
    $(`form[id=${formId}] input`).each(function(){
        var name = $(this).context.attributes.name.value;
        if(typeof(curParasSet[name]) == "undefined") {
            if($(this).context.attributes.type.value === "checkbox"){
                $(this).prop("checked", false);
            }
        }else{
            if($(this).context.attributes.type.value === "checkbox"){
                $(this).prop("checked", true);
            }else{
                $(this).val(curParasSet[name]);
            }
        }
    });
}