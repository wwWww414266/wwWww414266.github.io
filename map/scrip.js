// 初始化地图
let map = null;
let geolocation = null;

// 等待页面加载完成
window.onload = function() {
    initMap();
};

function initMap() {
    // 创建地图实例
    map = new AMap.Map('map', {
        zoom: 11,
        viewMode: '3D'
    });

    // 正确加载定位插件（必须用 AMap.plugin）
    AMap.plugin('AMap.Geolocation', function() {
        geolocation = new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
            buttonPosition: 'RB',
            buttonOffset: new AMap.Pixel(10, 20),
            zoomToAccuracy: true
        });
        map.addControl(geolocation);
    });

    // 按钮事件
    document.getElementById('locate-btn').addEventListener('click', locateUser);
}

function locateUser() {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = '🔄 正在定位中...';
    statusElement.style.color = '#ff9800';

    // 优先使用高德定位插件，如果不可用则回退到浏览器原生定位
    if (geolocation && typeof geolocation.getCurrentPosition === 'function') {
        geolocation.getCurrentPosition(function(status, result) {
            if (status === 'complete') onLocationSuccess(result);
            else onLocationError(result);
        });
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
            const result = {
                position: { lng: pos.coords.longitude, lat: pos.coords.latitude },
                accuracy: pos.coords.accuracy
            };
            onLocationSuccess(result);
        }, function(err) {
            onLocationError({ info: err.code === 1 ? 'PERMISSION_DENIED' : (err.code === 3 ? 'TIMEOUT' : 'POSITION_UNAVAILABLE'), message: err.message });
        }, { enableHighAccuracy: true, timeout: 10000 });
    } else {
        statusElement.innerHTML = '❌ 当前环境不支持定位';
        statusElement.style.color = '#f44336';
    }
}

function onLocationSuccess(result) {
    const statusElement = document.getElementById('status');
    const position = result.position;
    
    statusElement.innerHTML = '✅ 定位成功！';
    statusElement.style.color = '#4caf50';
    
    // 创建定位标记
    const marker = new AMap.Marker({
        position: position,
        title: '我的位置',
        content: '<div style="background-color: #4caf50; width: 20px; height: 20px; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        offset: new AMap.Pixel(-10, -10)
    });
    
    // 添加标记到地图
    map.add([marker]);
    
    // 设置地图中心到定位位置
    map.setCenter(position);
    
    // 添加信息窗口
    const infoWindow = new AMap.InfoWindow({
        content: `
            <div style="padding: 10px;">
                <h3>📍 我的位置</h3>
                <p>经度: ${position.lng.toFixed(6)}</p>
                <p>纬度: ${position.lat.toFixed(6)}</p>
                <p>精度: ${result.accuracy} 米</p>
            </div>
        `,
        offset: new AMap.Pixel(0, -30)
    });
    
    infoWindow.open(map, position);
    
    // 点击标记打开信息窗口
    marker.on('click', function() {
        infoWindow.open(map, position);
    });
}

function onLocationError(error) {
    const statusElement = document.getElementById('status');
    console.error('定位失败:', error);
    
    let errorMessage = '❌ 定位失败: ';
    switch (error.info) {
        case 'PERMISSION_DENIED':
            errorMessage += '用户拒绝授权定位权限';
            break;
        case 'TIMEOUT':
            errorMessage += '定位超时，请重试';
            break;
        case 'POSITION_UNAVAILABLE':
            errorMessage += '无法获取当前位置';
            break;
        default:
            errorMessage += error.message || '未知错误';
    }
    
    statusElement.innerHTML = errorMessage;
    statusElement.style.color = '#f44336';
}