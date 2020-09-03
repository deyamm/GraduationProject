/*
	待完善：
		1.	参数化设置外观
		2.	设置某个行业显示化不显示
		3.	不同行业设置为不同的颜色
		4.	自动设置日期间隔
 */
import * as THREE from '/static/threejs/build/three.module.js';
import {OrbitControls} from '/static/threejs/examples/jsm/controls/OrbitControls.js';
import {chart} from '/static/modules/moneyTreemap.js';
import Stats from '/static/statsjs/build/stats.module.js';
import {drawMultiLine} from "/static/modules/multiLine.js";

/*
	绘制图的基础组件，包括渲染器renderer，性能监视器stats，
	相机camera，用鼠标来调整相机位置的controls，
	显示图表的场景scene.
*/
var renderer, stats, camera, controls, scene;
//表示被鼠标选中的柱体
var INTERSECTED;
/*表示3根坐标轴的长度，其中x,y,z与三维坐标相对应，
	而不是图表的x,y,z，该两个坐标系的y轴与z轴相反
*/
var xlen, ylen, zlen;
//表示鼠标的位置，用于判断鼠标选中的物体
var mouse = new THREE.Vector2();
//raycaster来完成判断鼠标选中物体的功能
var raycaster = new THREE.Raycaster();
//用于放置绘制的柱体
var barCanvas = new THREE.Object3D();
//
var axisCanvas = new THREE.Object3D();
//用于绘制的数据
var columns, data, index, codes;
//数组中的最大值和最小值
var max = -1, min = -1;
/*表示绘制的柱体的底面的长和宽，
	padding表示每个柱体占据的大小，与柱体的长和宽有关，
	通常底面长和宽相同
*/
var barLength, barWidth, padding;

var startX, startY, startZ;
/*表示数据正负的类型
    0   表示最大值和最小值都为正数
    1   表示最大值为正数，最小值为负数
    2   表示最大值和最小值为负数
 */
var dataType;
/*Axis表示3根坐标轴，在图中为加粗黑色线；
 	xoy等3个数组用于放置图中浅色细线，细线将平面划分为方格，便于对照数据，
 	将细线作为全局变量便于在照相机位置移动时，调整线的位置；
 	调整线的位置所用到的变量为xP, yP, zP。
*/
var xoy = [], xoz = [], yoz = [], xAxis, yAxis, zAxis, xP, yP, zP;
/*
	当鼠标选中一个柱体后，图中会显示出8条黑色细线将柱体长宽画在坐标系中画出
*/
var targetlines = [];
/*
	valueSprite用于在柱体上方显示柱体的值，
	infoSprite用于在鼠标旁显示所选柱体的三个坐标系的值
*/
var infoSprite, containerId, infoContainerId;
//用于表示3个坐标轴代表的内容
var xlabel, ylabel, zlabel;
var xText, yText, zText;
//用于存放3个坐标轴上每个刻度标签的内容
var xlabels = [], ylabels = [], zlabels = [];
//用于表示infoSprite的位置
var mousePos = new THREE.Vector2();
//
var color = d3.scaleOrdinal(d3.schemeCategory10);

var light;

var widthScale, heightScale;

var sendData = null;

//定位偏移，由于render的left属性，需要将mouse的位置减去偏移值
var offset;

var curTreemapData;

var curParas;

var barParas;
function initParas(paras){
	curParas = paras;
	barParas = paras;
	widthScale = paras.hasOwnProperty("widthScale") ? paras["widthScale"] : 0.5;
	heightScale = paras.hasOwnProperty("heightScale") ? paras["heightScale"] : 0.5;
	columns = paras.hasOwnProperty("xData") ? paras["xData"] : null;
	index = paras.hasOwnProperty("yData") ? paras["yData"] : null;
	data = paras.hasOwnProperty("zData") ? paras["zData"] : null;
	codes = paras.hasOwnProperty("codes") ? paras["codes"] : null;
	//console.log(data);
	//console.log(index);
	//console.log(columns);
	//console.log(codes);
	if(columns === null || index === null || data === null){
		alert("数据错误");
	}

	barLength = paras.hasOwnProperty("barLength") ? paras["barLength"] : 50;
	barWidth = paras.hasOwnProperty("barWidth") ? paras["barWidth"] : 50;
	ylen = paras.hasOwnProperty("zlen") ? paras["zlen"] : 600;
	padding = barLength * 1.2;
	xlen = padding * columns.length;
	zlen = padding * index.length;
	startX = paras.hasOwnProperty("xOffset") ? paras["xOffset"] : -xlen;
	startY = paras.hasOwnProperty("yOffset") ? paras["yOffset"] : 0;
	startZ = paras.hasOwnProperty("zOffset") ? paras["zOffset"] : 0;
	xText = paras.hasOwnProperty("xlabel") ? paras["xlabel"] : "x";
	yText = paras.hasOwnProperty("ylabel") ? paras["ylabel"] : "y";
	zText = paras.hasOwnProperty("zlabel") ? paras["zlabel"] : "z";
	containerId = paras.hasOwnProperty("containerId") ? paras["containerId"] : null;
	infoContainerId = paras.hasOwnProperty("infoContainerId") ? paras["infoContainerId"] : null;

	var container = $("#" + containerId);

	container.css("width", String(Math.floor(window.innerWidth * widthScale)) + "px");
	container.css("height", String(window.innerHeight) + "px");
	var t = container.css("left");
	offset = parseFloat(t.substring(0, t.length-2));

}

/*
	用于初始化画图所需要的基础内容，
	包括柱体底面长宽，3条坐标轴长度；
	定义渲染器renderer, 性能监视器stats； 并将其dom对象添加到html中；
	添加所用到的事件监视器。
*/
function initThree(){


	infoSprite = document.getElementById(infoContainerId);

	//渲染器renderer
	renderer = new THREE.WebGLRenderer({
		antialias: true
	});
	renderer.setSize(window.innerWidth * widthScale, window.innerHeight * heightScale);
	document.getElementById(containerId).appendChild(renderer.domElement);
	renderer.setClearColor(0xFFFFFF, 1.0);

	//性能监视器stats
	//stats = new Stats();
	//stats.showPanel(0);
	//document.getElementById(containerId).appendChild(stats.dom);

	//鼠标移动事件，获取鼠标在网页二维空间的坐标
	document.addEventListener('mousemove', onDocumentMouseMove, false);
	//网页改变大小事的事件
	window.addEventListener('resize', onWindowResize, false);

	document.addEventListener('click', clickDrawGraph, false);
}

/*
	定义相机camera，此处定义的是正投影相机，与之对应的是透视投影相机，同时定义controls，该对象用于判断鼠标选中的柱体
*/
function initCamera(){
	camera = new THREE.OrthographicCamera(-window.innerWidth/1.5*widthScale, window.innerWidth/1.5*widthScale, window.innerHeight/1.5*heightScale, -window.innerHeight/1.5*heightScale, 1, 10000);
	camera.position.x = 800;
	camera.position.y = 200;
	camera.position.z = 1800;

	controls = new OrbitControls(camera, renderer.domElement);
	controls.update();
}

//定义场景，并设置背景颜色
function initScene(){
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf3f3f3);
}

//设置光照，此处用的是点光源
function initLight(){

	light = new THREE.PointLight(0xFFFFFF, 1.0, 0);
	light.position.set(0, 500, 0);
	scene.add(light);
}

/*
	初始化需要的组件，包括：
	1.	用于标示所选柱体在三个坐标轴上位置的8条黑色细线，
	2.	用于显示柱体数值的valueSprite和infoSprite
	3.	3条坐标轴的标签
	4.	根据数据画出柱体
	5.	画出坐标轴，包括3条黑色粗线坐标轴以及3个平面上浅色细线	
*/
function initObject(){
	/*
		8条黑色细线所对应的位置
		0		yoz 平行y轴
		1		yoz 平行z轴
		2		xoz 平行x轴
		3		xoz	平行z轴
		4		柱高	平行x轴
		5		柱高	平行y轴
		6		xoy	平行x轴
		7		xoy	平行y轴
	*/
	for(var i = 0; i < 8; i++){
		targetlines.push(new THREE.Line(createAxis(xlen), new THREE.LineBasicMaterial({color: 0x000000})));
		targetlines[i].renderOrder = 1;
		scene.add(targetlines[i]);
	}
	targetlines[0].rotation.y = 90 * Math.PI / 180;
	targetlines[1].rotation.z = 90 * Math.PI / 180;
	targetlines[3].rotation.z = 90 * Math.PI / 180;
	targetlines[5].rotation.y = 90 * Math.PI / 180;
	targetlines[7].rotation.y = 90 * Math.PI / 180;



	//绘制柱体
	drawBar();

	//绘制坐标轴及浅色线
	drawAxis();
}

/*实现比例尺的功能
	根据数据的正负类型获得柱体的高度
	0	最小值为正
	1	最小值为负，最大值为正
	2	最大值为负
 */
function getBarHeight(value){
	if(dataType === 0){
		return (value-min)/(max-min) * ylen/2;
    }else if(dataType === 1){
		return value/Math.max(max, -min) * ylen/2
    }else {
		return (value-max)/(max-min) * ylen/2;
	}
}

/*
	该函数用于绘制坐标轴，根据data数组，data目前为3维数组，分别为时间、类别以及某类别在某时间的数值。
*/
function drawBar(){
	//获取最大值与最小值
	min = -1;
	max = -1e9;
	for(var i = 0; i < data.length; i++){
		for(var j = 0; j < data[i].length; j++){
			if(data[i][j] > max){
				max = data[i][j];
			}
			if(min === -1){
				min = data[i][j];
			}else{
				if(min > data[i][j]){
					min = data[i][j];
				}
			}
		}
	}

	if(min >= 0) {
        dataType = 0;
        min = min * 0.8;
        max = max * 1.2;
    }else if(max >= 0 && min < 0){
        dataType = 1;
        max = max * 1.2;
        min = min * 1.2;
    }else{
        dataType = 2;
        max = max * 0.8;
        min = min * 1.2;
    }
    min = parseFloat(min.toFixed(0));
	max = parseFloat(max.toFixed(0));

	for(var i = 0; i < data.length; i++){
		var line = data[i];
		for(var j = 0; j < line.length; j++){
			var h = getBarHeight(line[j]);
			h = h.toFixed(2);
			var geometry = new THREE.BoxGeometry(barLength, Math.abs(h), barWidth);
			var m = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: color(columns[j])}));
			m.userData = {
				x: columns[j],
				y: index[i],
				z: parseFloat(line[j].toFixed(2)),
				code: codes[j]
			};
			m.position.set( startX + padding * j + padding / 2, startY + h / 2, startZ - padding / 2 - padding * i);
			barCanvas.add(m);
		}
	}
	
	scene.add(barCanvas);
}


//绘制坐标轴以及将平面分格的细线
function drawAxis(){

	var mLine = new THREE.LineBasicMaterial({
		color: 0x000000,
		linewidth: 3
	});
	
	//x轴
	xAxis = new THREE.Line(createAxis(xlen), mLine);
	xAxis.position.y = startZ - ylen/2;
	axisCanvas.add(xAxis);
	//z轴
	zAxis = new THREE.Line(createAxis(ylen), mLine);
	zAxis.position.x = startX + xlen;
	zAxis.position.z = startY - zlen;
	zAxis.position.y = startZ - ylen/2;
	zAxis.rotation.z = 90 * Math.PI / 180;
	axisCanvas.add(zAxis);
	//y轴
	yAxis = new THREE.Line(createAxis(zlen), mLine);
	yAxis.position.x = startX + xlen;
	yAxis.position.y = startZ - ylen/2;
	yAxis.rotation.y = 90 * Math.PI / 180;
	axisCanvas.add(yAxis);

	//xoy平面垂直于坐标系x轴
	for(var i = 0; i <= xlen / padding; i++){
		var t_line = new THREE.Line(createAxis(zlen), new THREE.LineBasicMaterial({color: 0x778899}));
		t_line.rotation.y = 90 * Math.PI / 180;
		t_line.position.x = startX + i * padding;
		xoy.push(t_line);
		axisCanvas.add(t_line);
	}

	//xoy垂直于坐标系y轴
	for(var i = 0; i <= zlen / padding; i++){
		var t_line = new THREE.Line(createAxis(xlen), new THREE.LineBasicMaterial({color: 0x778899}));
		t_line.position.z = startZ - i * padding;
		t_line.position.x = startX;
		xoy.push(t_line);
		axisCanvas.add(t_line);
	}
	
	//xoz垂直于坐标系x轴
	for(var i = 0; i <= xlen / padding; i++){
		var t_line = new THREE.Line(createAxis(ylen), new THREE.LineBasicMaterial({color: 0x778899}));
		t_line.rotation.z = 90 * Math.PI / 180;
		t_line.position.x = startX + i * padding;
		t_line.position.y = startY - ylen/2;
		t_line.position.z = startZ + zlen;
		xoz.push(t_line);
		axisCanvas.add(t_line);
	}
	
	//xoz垂直于坐标系z轴
	for(var i = 0; i <= ylen / padding; i++){
		var t_line = new THREE.Line(createAxis(xlen), new THREE.LineBasicMaterial({color: 0x778899}));
		t_line.position.z = startZ - zlen;
		t_line.position.y = startY + i * padding - ylen/2;
		t_line.position.x = startX;
		xoz.push(t_line);
		axisCanvas.add(t_line);
	}

	//yoz垂直于坐标系y轴
	for(var i = 0; i <= zlen / padding; i++){
		var t_line = new THREE.Line(createAxis(ylen), new THREE.LineBasicMaterial({color: 0x778899}));
		t_line.rotation.z = 90 * Math.PI / 180;
		t_line.position.z = startZ - i * padding;
		t_line.position.y = startY - ylen/2;
		yoz.push(t_line);
		axisCanvas.add(t_line);
	}

	//yoz垂直于坐标系z轴
	for(var i = 0; i <= ylen / padding; i++){
		var t_line = new THREE.Line(createAxis(zlen), new THREE.LineBasicMaterial({color: 0x778899}));
		t_line.rotation.y = 90 * Math.PI / 180;
		t_line.position.y = startY + i * padding - ylen/2;
		yoz.push(t_line);
		axisCanvas.add(t_line);
	}

	//3个坐标轴的标签
	xlabel = drawAxisText(xText, {
		fontSize: 100,
		fontColor: {r: 0, g: 0, b: 0, a: 1.0},
		backColor: {r: 255, g: 255, b: 255, a: 0.0},
		borderColor: {r: 255, g: 255, b: 255, a: 0.0}
	});
	axisCanvas.add(xlabel);

	ylabel = drawAxisText(yText,{
		fontSize: 100,
		fontColor: {r: 0, g: 0, b: 0, a: 1.0},
		backColor: {r: 255, g: 255, b: 255, a: 0.0},
		borderColor: {r: 255, g: 255, b: 255, a: 0.0}
	});
	axisCanvas.add(ylabel);

	zlabel = drawAxisText(zText,{
		isVertical: true,
		fontSize: 100,
		fontColor: {r: 0, g: 0, b: 0, a: 1.0},
		backColor: {r: 255, g: 255, b: 255, a: 0.0},
		borderColor: {r: 255, g: 255, b: 255, a: 0.0}
	});
	axisCanvas.add(zlabel);

	//x 轴每一个刻度的标签
	for(var i = 0; i < columns.length; i++){
		var xSprite = drawAxisText(columns[i],{
			isVertical: true,
			fontSize: 75,
			fontColor: {r: 0, g: 0, b: 0, a: 1.0},
			backColor: {r: 0, g: 0, b: 0, a: 0.0},
			borderColor: {r: 255, g: 255, b: 255, a: 0.0}
		});
		axisCanvas.add(xSprite);
		xlabels.push(xSprite);
		xSprite.position.set(startX + (i-1) * padding + padding/2, startY-ylen/2, startZ + 30);
	}

	//y 轴每一个刻度的标签
	for(var i = 0; i < index.length; i++){
		if(i%5 !== 0){
			ylabels.push(null);
			continue;
		}
		var ySprite = drawAxisText(index[i], {
			fontSize: 75,
			fontColor: {r: 0, g: 0, b: 0, a: 1.0},
			backColor: {r: 0, g: 0, b: 0, a: 0.0},
			borderColor: {r: 255, g: 255, b: 255, a: 0.0}
		});
		axisCanvas.add(ySprite);
		ylabels.push(ySprite);
		ySprite.position.set(startX + xlen + 30, startY-ylen/2, startZ - i * padding - padding/2);
	}

	//z轴每一个刻度的标签
	var unit;
	var startNum;
	if(dataType === 0) {
		unit = (max-min)/(ylen/2/padding);
		startNum = min - (max - min);
	}else if(dataType === 1){
		unit = Math.max(max, -min)/(ylen/2/padding);
		startNum = min;
	}else{
		unit = (max-min)/(ylen/2/padding);
		startNum = min;
	}
	for(var i = 0; i <= ylen/padding; i++){
		var t = startNum + i * unit;
		t = t.toFixed(2);
		var zSprite = drawAxisText(t, {
			fontSize: 75,
			fontColor: {r: 0, g: 0, b: 0, a: 1.0},
			backColor: {r: 255, g: 255, b: 255, a: 0.0},
			borderColor: {r: 255, g: 255, b: 255, a: 0.0}
		});
		axisCanvas.add(zSprite);
		zlabels.push(zSprite);
		zSprite.position.set(startX + xlen + 30, startY + i * padding - ylen/2, startZ - zlen);
	}
	scene.add(axisCanvas);
}

//创建一条指定长度线的几何体，得到的线通过绕不同的轴旋转并移动到对应位置
function createAxis(len){
	var axis = new THREE.Geometry();

	axis.vertices.push(new THREE.Vector3(0, 0, 0));
	axis.vertices.push(new THREE.Vector3(len, 0, 0));

	return axis;
}

/*
	该函数用于绘制将坐标平面划分为小格的浅色细线。
	由于需要根据相机的角度来调整细线的位置，所以根据相机的位置将空间分为8个区域，对于每个区域设置xP, yP, zP的值，
	该值用于表示细线相应的位置。
	同时，随着相机角度的变换，3条坐标轴、坐标轴标签以及刻度标签的位置都需要变化，此功能在该函数中实现
*/
function drawIndicatorLine(x, y, z){

	//判断相机的位置并设置坐标轴的位置
	if(x >= 0 && z >= 0 && y >= 0){//1 octant
		zP = -zlen; 
		xP = 0;
		yP = -ylen/2;
		xAxis.position.set(startX, startY - ylen/2, startZ);
		yAxis.position.set(startX + xlen, startY - ylen/2, startZ);
		zAxis.position.set(startX + xlen, startY - ylen/2, startZ - zlen);
	}else if(x < 0 && z >= 0 && y >= 0){//2 octant
		xP = xlen;
		zP = -zlen;
		yP = -ylen/2;
		xAxis.position.set(startX, startY - ylen/2, startZ);
		yAxis.position.set(startX, startY - ylen/2, startZ);
		zAxis.position.set(startX + xlen, startY - ylen/2, startZ);
	}else if(x < 0 && z < 0 && y >= 0){//3 octant
		xP = xlen;
		zP = 0;
		yP = -ylen/2;
		xAxis.position.set(startX, startY - ylen/2, startZ - zlen);
		yAxis.position.set(startX, startY - ylen/2, startZ);
		zAxis.position.set(startX + xlen, startY - ylen/2, startZ - zlen);
	}else if(x >= 0 && z < 0 && y >= 0){//4 octant
		xP = 0;
		yP = -ylen/2;
		zP = 0;
		xAxis.position.set(startX, startY - ylen/2, startZ - zlen);
		yAxis.position.set(startX + xlen, startY - ylen/2, startZ);
		zAxis.position.set(startX + xlen, startY - ylen/2, startZ);
	}else if(x >= 0 && z >= 0 && y < 0){//5 octant
		zP = -zlen;
		yP = ylen/2;
		xP = 0;
		xAxis.position.set(startX, startY + ylen/2, startZ);
		yAxis.position.set(startX + xlen, startY + ylen/2, startZ);
		zAxis.position.set(startX + xlen, startY - ylen/2, startZ - zlen);
	}else if(x < 0 && z >= 0 && y < 0){//6 octant
		yP = ylen/2;
		xP = xlen;
		zP = -zlen;
		xAxis.position.set(startX, startY + ylen/2, startZ);
		yAxis.position.set(startX, startY + ylen/2, startZ);
		zAxis.position.set(startX + xlen, startY - ylen/2, startZ);
	}else if(x < 0 && z < 0 && y < 0){//7 octant
		yP = ylen/2;
		xP = xlen;
		zP = 0;
		xAxis.position.set(startX, startY + ylen/2, startZ - zlen);
		yAxis.position.set(startX, startY + ylen/2, startZ);
		zAxis.position.set(startX + xlen, startY - ylen/2, startZ - zlen);
	}else{//8 octant
		yP = ylen/2;
		xP = zP = 0;
		xAxis.position.set(startX, startY + ylen/2, startZ - zlen);
		yAxis.position.set(startX + xlen, startY + ylen/2, startZ);
		zAxis.position.set(startX, startY - ylen/2, startZ);
	}
	//在xP, yP, zP的基础上设置tx, tz的值，来表示坐标轴标签和坐标轴刻度标签应该显示的位置
	var tx, tz;
	if(zP === -zlen){
		tz = padding / 2;
	}else{
		tz = -zlen - padding/2;
	}
	xlabel.position.set(startX + xlen/2, startY + yP, tz>=0 ? startZ + tz + padding : startZ + tz - padding);
	for(var i = 0; i < xlabels.length; i++){
		xlabels[i].position.set(startX + (i+0.5) * padding, startY + yP, startZ + tz);
	}

	if(xP === xlen){
		tx =  - padding/2;
	}else{
		tx = xlen + padding/2;
	}
	ylabel.position.set(tx > 0 ? startX + tx + padding : startX + tx - padding, startY + yP, startZ - zlen/2);
	for(var i = 0; i < ylabels.length; i++){
		if(ylabels[i] == null){
			continue;
		}
		ylabels[i].position.set(startX + tx, startY + yP, startZ - (i+0.5) * padding);
	}

	if((zP === -zlen && xP === 0) || (zP === 0 && xP === xlen)){
		tz = -zlen;
	}else{
		tz = 0;
	}
	zlabel.position.set(startX + xlen+100, startY, startZ + tz);
	for(var i = 0; i < zlabels.length; i++){
		zlabels[i].position.set(startX + xlen+30, startY + i * padding - ylen/2, startZ + tz);
	}


	//改变浅色细线的位置
	for(var i = 0; i < xoy.length; i++){
		//xoy[i].position.x = startX + i * padding;
		xoy[i].position.y = startY + yP;
	}
	for(var i = 0; i < xoz.length; i++){
		//xoz[i].position.x = startX;
		xoz[i].position.z = startZ + zP;
	}
	for(var i = 0; i < yoz.length; i++){
		yoz[i].position.x = startX + xP;
	}
	
}

/*
	Sprite为任何时候都朝向相机的二维平面，因此利用Sprite来作为坐标轴的标签以及显示需要的数据。
	Sprite的创建过程为先将需要显示的内容绘制到canvas中，之后将canvas传递给SpriteMaterial的map参数，之后用该SpriteMaterial创建Sprite。
	创建好Sprite之后，需要设置Sprite的center以及scale来更好的显示信息。
	此处将一般的Sprite创建过程分为两部分，分别为绘制canvas与利用canvas创建Sprite并进行相关设置。
*/

/*
	该函数实现绘制在canvas上绘制文字，
		message			需要绘制的字符串
		paras			绘制字符串的相同参数，
						包括字体大小、颜色，背景颜色，边框颜色
		如果对应参数没有设置，则将会用默认的值.
		该函数在文字超出一定长度后会调整canvas的大小。
*/
function drawCanvas(message, paras){
	if(paras === undefined){
		paras = {};
	}
	var isVertical = paras.hasOwnProperty("isVertical") ? paras["isVertical"] : false;
	var fontSize = paras.hasOwnProperty("fontSize") ? paras["fontSize"] : 75;
	var fontColor = paras.hasOwnProperty("fontColor") ? paras["fontColor"] : {r: 255, g: 255, b: 255, a: 1.0};
	var backColor = paras.hasOwnProperty("backColor") ? paras["backColor"] : {r: 0, g: 0, b: 0, a: 0.4};
	var borderColor = paras.hasOwnProperty("borderColor") ? paras["borderColor"] : {r: 0, g: 0, b: 0, a: 1.0};
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontSize + "px Arial";
	var textWidth, textHeight;
	if(isVertical){
		textWidth = fontSize;
		textHeight = fontSize * message.length;
		canvas.width = canvas.height * 0.5;
	}else{
		textWidth = context.measureText(message).width;
		textHeight = fontSize;
		canvas.height = canvas.width * 0.5;
	}

	if(!isVertical && textWidth >= canvas.width){
		canvas.width = 1.2 * textWidth;
		canvas.height = canvas.width * 0.5;
		context = canvas.getContext('2d');
	}
	if(isVertical && textHeight >= canvas.height){
		canvas.height = textHeight * 1.2;
		context = canvas.getContext('2d');
		canvas.width = canvas.height * 0.5;
	}
	context.font = "Bold " + fontSize + "px Arial";
	context.textAlign = "center";
	context.fillStyle = `rgba(${backColor.r},${backColor.g},${backColor.b},${backColor.a})`;
	context.strokeStyle = `rgba(${borderColor.r},${borderColor.g},${borderColor.b},${backColor.a})`;
	
	/*需要用lineTo函数来绘制显示文字的区域，
		用stroke来绘制边框，fill来填充，fillText来添加文字
		在调用相应函数之前，应调用stokeStyle、fillStyle来设置样式
	*/
	context.beginPath();
	context.moveTo(0, 0);
	context.lineTo(canvas.width, 0);
	context.lineTo(canvas.width, canvas.height);
	context.lineTo(0, canvas.height);
	context.closePath();
	context.stroke();
	context.fill();
	context.fillStyle = `rgba(${fontColor.r},${fontColor.g},${fontColor.b} ,${fontColor.a})`;
	if(isVertical){
		for(var i = 0; i < message.length; i++ ){
			context.fillText(message[i],canvas.width/2, (i+1)*fontSize);
		}
	}else{
		context.fillText(message, canvas.width/2, fontSize);
	}
	return canvas;
}

//该函数利用返回的canvas创建Sprite,并设置Sprite的center和scale。该函数用于创建一般的Sprite
function drawAxisText(text, paras){
	var canvas = drawCanvas( text, paras);
	var axisTexture = new THREE.Texture(canvas);
	axisTexture.needsUpdate = true;
	var label = new THREE.Sprite(new THREE.SpriteMaterial({map: axisTexture}));
	label.scale.set(canvas.width/5, canvas.height/5, 1);
	label.center = new THREE.Vector2(0.5, 0.5);
	return label;
}

function drawInfoText(target){

	infoSprite.style.visibility = "visible";
	infoSprite.style.left = mousePos.x + "px";
	infoSprite.style.top = mousePos.y + "px";
	document.getElementById('x').innerHTML = xText + "<br>"+ target.userData.x;
	document.getElementById('y').innerHTML = yText + "<br>" + target.userData.y;
	document.getElementById('z').innerHTML = zText + "<br>" + target.userData.z;
}

//窗口大小改变后的事件函数，刷新整个场景。
function onWindowResize(){
	camera.updateProjectionMatrix();

	location.reload();
	renderer.setSize(window.innerWidth * widthScale, window.innerHeight * heightScale);
}

//鼠标移动事件，将鼠标的坐标转化为API需要的二维坐标。
function onDocumentMouseMove(event){
	event.preventDefault();

	mousePos.x = event.clientX;
	mousePos.y = event.clientY;

	mouse.x = ((event.clientX - offset) / window.innerWidth / widthScale) * 2 - 1;
	mouse.y = - ((event.clientY - offset) / window.innerHeight / heightScale) * 2 + 1;
}

/*
	点击后，绘制treemap以及多重折线图
 */
function clickDrawGraph(event){
	var flag = 0;
	if(INTERSECTED != null){
		if($("#resize").css("visibility") === "hidden"){
			$("#resize").css("visibility", "visible");
		}
		if($("#treediv").css("visibility") === "hidden"){
			$("#treediv").css("visibility", "visible");
			barParas["widthScale"] = 0.5;
			flag = 1;
		}
		var barParasSet = getFormParas("barParasSet");
		if(sendData == null || sendData["industry_name"] !== INTERSECTED.userData.x || sendData["date"] !== INTERSECTED.userData.y) {
			var treemapParas = getFormParas("treemapParasSet");
			sendData = {
				industry_name: INTERSECTED.userData.x,
				industry_code: INTERSECTED.userData.code,
				date: INTERSECTED.userData.y,
				treemapParas: treemapParas,
			};
			//向服务端请求矩形树图的数据
			$.ajax({
				url: "/bar/treemap_data",
				type: "POST",
				data: JSON.stringify(sendData),
				dataType: "json",
				async: false,
				success: function (data) {
					//console.log(data);
					curTreemapData = data;
					$("#treediv").css("display", "block");
					var s = document.getElementById("treeSvg");
					while(s.hasChildNodes()){
						s.removeChild(s.firstChild);
					}
					var chartWidth = $("body").width() - $("#canvas-frame").outerWidth() * barParas["widthScale"] - $("#resize").outerWidth() - 2;
					//console.log($("body").width() + " " + $("#canvas-frame").width() + " " + $("#resize").outerWidth() + " " + chartWidth);
					chart({
						data: data,
						widthScale: chartWidth/$("body").width(),
						heightScale: 0.5,
						container: "treeSvg"
					});

					var numPerRow = Math.floor($("#canvas-frame").width() * barParas["widthScale"] / 100);
					d3.select("#legendSvg")
						.selectAll("g")
						.attr("transform", function(d, i){
            				var row = Math.floor(i / numPerRow);
            				var numThisRow = columns.length - row * numPerRow > numPerRow ? numPerRow : columns.length - row * numPerRow;
            				var startPos = ($("#canvas-frame").width()*barParas["widthScale"] - numThisRow * 100) / 2;
            				//console.log(`${row} ${numThisRow} ${startPos}`);
            				return `translate(${startPos + i % numThisRow * 100}, ${row * 40})`;
						});
					$("#container").css("left", String($("#canvas-frame").width()*barParas["widthScale"] * 0.05) + "px");

				}
			});
		}
		var lineParas = getFormParas("lineParasSet");
		if(lineParas["industry_level"] === '个股'){
			lineParas["industry_level"] = 'L4';
		}
		//console.log(lineParas);
		//向服务器请求多重折线图的数据
		$.ajax({
			url: "/bar/line_data",
			type: "POST",
			data: JSON.stringify({
				industry_level: barParasSet["industryLevel"],
				industry_name: INTERSECTED.userData.x,
				industry_code: INTERSECTED.userData.code,
				line_paras: lineParas,
				start_date: '20200101',
				end_date: '20200201'
			}),
			dataType: "json",
			success: function(data){
				d3.select("#multiLineSvg").selectAll("g").remove();
				$("#lineSetButton").css("display", "block");
				$("#lineParasSet").css("display", "block");
				$("#lineInfo").css("display", "block");
				$("#lineSave").css("display", "block");
				drawMultiLine({
					data: data,
					container: "multiLineSvg",
					width: $("#multiLineDiv").width() * 0.8,
					dataType: "流入金额"
				})
			}
		});
	}
	if(flag === 1){
		resizeRender(barParas["widthScale"]);
		redraw(barParas);
	}
}

/*
	该函数用于绘制将所选柱体标示到3条坐标轴上的黑色细线。
	该细线共有8根，根据坐标轴位置、坐标平面位置改变位置。
*/
function drawTargetLine(target){

	for(var i = 0; i < targetlines.length; i++){
		targetlines[i].visible = true;
	}
	//表示两条柱高线的长度
	var x = Math.abs(xP - target.x + startX);
	var z = Math.abs(zP - target.z + startZ);

	var xpos = 0, zpos = 0;//表示两条柱高线的起点位置
	if(target.x-startX < xP){
		xpos = target.x-startX;
	}
	if(target.z-startZ > zP){
		zpos = target.z-startZ;
	}
	//对8根线设置长度以及位置，长度的改变通过设置线的终点坐标来实现
	targetlines[0].geometry.vertices[1].set(zlen, 0, 0);
	targetlines[0].position.set(startX + xP, target.y * 2, startZ);
	targetlines[0].geometry.verticesNeedUpdate = true;

	targetlines[1].geometry.vertices[1].set(ylen, 0, 0);
	targetlines[1].position.set(startX + xP, startY - ylen/2, target.z);
	targetlines[1].geometry.verticesNeedUpdate = true;

	targetlines[2].geometry.vertices[1].set(xlen, 0, 0);
	targetlines[2].position.set(startX, target.y * 2, startZ + zP);
	targetlines[2].geometry.verticesNeedUpdate = true;

	targetlines[3].geometry.vertices[1].set(ylen, 0, 0);
	targetlines[3].position.set(target.x, startY - ylen/2, startZ + zP);
	targetlines[3].geometry.verticesNeedUpdate = true;

	targetlines[4].geometry.vertices[1].set(x, 0, 0);
	targetlines[4].position.set(startX + xpos, target.y * 2, target.z);
	targetlines[4].geometry.verticesNeedUpdate = true;

	targetlines[5].geometry.vertices[1].set(z, 0, 0);
	targetlines[5].geometry.verticesNeedUpdate = true;
	targetlines[5].position.set(target.x, target.y * 2, startZ + zpos);

	targetlines[6].geometry.vertices[1].set(xlen, 0, 0);
	targetlines[6].position.set(startX, startY + yP, target.z);
	targetlines[6].geometry.verticesNeedUpdate = true;

	targetlines[7].geometry.vertices[1].set(zlen, 0, 0);
	targetlines[7].position.set(target.x, startY + yP, startZ);
	targetlines[7].geometry.verticesNeedUpdate = true;
}


export function resizeRender(widScale){
	widthScale = widScale;
	//location.reload();
	renderer.setSize(window.innerWidth * widthScale, window.innerHeight * heightScale);
	$("#container").css("width", String(window.innerWidth * widthScale * 0.9) + "px");
	camera.left = -window.innerWidth / 1.5 * widthScale;
	camera.right = window.innerWidth / 1.5 * widthScale;

	camera.updateProjectionMatrix();
}
//进行场景的初始化
export function threeStart(paras){

	initParas(paras);
	initThree();
	initCamera();
	initScene();
	initLight();
	initObject();
	animation();
}

/*
	绘制整个场景的函数
	函数开关和结尾利用stats.begin()和stats.end()获取性能，
	raycaster可以根据鼠标位置和相机的位置来判断鼠标是否选中否一物体，
	之后根据是否选中柱体绘制不同的内容，
		当选中柱体后，会改变被选中柱体的颜色，调用drawText()在柱体上方显示柱体的数值，调用drawTargetLine()函数将柱体标示在3个坐标轴上
		当没有选中柱体时，场景不会发生变化，如果之前有柱体被选中，那么会取消该柱体的选中状态，即不再显示第一种情况中绘制的内容
*/
function render(){
	//stats.begin();
	//获取鼠标选中的柱体
	raycaster.setFromCamera(mouse, camera);
	var intersects = raycaster.intersectObjects(barCanvas.children);
	var cameraPos = camera.position;
	light.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
	if(intersects.length > 0){
		//让被选中的首个柱体作为目标，改变其颜色
		if(INTERSECTED !== intersects[0].object){
			//如果目标发生改变，刚将之前时刻的目标颜色恢复
			if(INTERSECTED){
				INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
			}
			//改变新的目标柱体的颜色
			INTERSECTED = intersects[0].object;
			INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
			INTERSECTED.material.emissive.setHex(0x00ff00);
			var target = new THREE.Vector3(INTERSECTED.position.x, INTERSECTED.position.y, INTERSECTED.position.z);
			//绘制指示线以及柱体的信数据(z)
			drawTargetLine(target);
		}
		//使柱体的信息（x, y, z)能随着鼠标的移动而移动
		drawInfoText(INTERSECTED);

	}else{
		//如果没有选中柱体，则将特定的组件隐藏
		if(INTERSECTED){
			INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
		}
		INTERSECTED = null;
		for(var i = 0; i < targetlines.length; i++){
			targetlines[i].visible = false;
		}
		infoSprite.style.visibility = "hidden";
	}
	//每一时刻都应绘制将坐标平面分成小格的浅色细线
	drawIndicatorLine(cameraPos.x, cameraPos.y, cameraPos.z);
	renderer.render(scene, camera);
	controls.update();
	//stats.end();
}

function animation(){
	render();
	requestAnimationFrame(animation);
}

export function redraw(paras){
	scene.remove(barCanvas);
	scene.remove(axisCanvas);
	//delete barCanvas;
	//delete axisCanvas;
	barCanvas = new THREE.Object3D();
	axisCanvas = new THREE.Object3D();
	xlabels = [];
	ylabels = [];
	zlabels = [];
	xoy = [];
	yoz = [];
	xoz = [];
	initParas(paras);
	drawBar();
	drawAxis();
	animation();
}

export {curParas, curTreemapData, color};