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
    
    // 清掉之前的覆盖物（如果需要）
    try { map.clearMap(); } catch(e){}

    // 头像文件（相对路径或外链）
    const avatarUrl = 'images/avatar.jpg'; // 如果把图片放到 map/images 下

    // 方法1：把头像放到标记内容里
    const markerContent = `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto">
        <img src="${avatarUrl}" alt="开发者" 
             style="width:56px;height:56px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:block"/>
        <div style="background:#fff;padding:4px 8px;border-radius:8px;margin-top:6px;font-size:12px;color:#333">
            开发者  
        </div>
      </div>`;

    const marker = new AMap.Marker({
        position: position,
        content: markerContent,
        offset: new AMap.Pixel(-28, -56) // 减小竖向偏移，避免被裁剪
    });
    
    // 添加标记到地图
    map.add([marker]);
    
    // 设置地图中心到定位位置（改为把点放到容器下方）
    const targetRatio = 0.65; // 0.0 = 顶部, 1.0 = 底部，调整以改变点在视图中的垂直位置
    try {
        map.setCenter(position);
        const size = (typeof map.getSize === 'function') ? map.getSize() : { width: map.getContainer().clientWidth, height: map.getContainer().clientHeight };
        const currentY = size.height * 0.5;
        const targetY = Math.round(size.height * targetRatio);
        const dy = targetY - currentY;
        const panY = -Math.round(dy);
        console.log('map size', size, 'targetRatio', targetRatio, 'panY', panY);

        // 延迟再 pan 与打开 infoWindow，确保 infoWindow 不会覆盖回原位
        setTimeout(() => {
            try { map.panBy(0, panY); }
            catch (err) { console.warn('panBy 失败，可能不支持该方法', err); }

            // 在平移完成后再打开信息窗，避免 infoWindow 导致二次居中
            try { infoWindow.open(map, position); } catch(e){ console.warn('infoWindow open failed', e); }
        }, 500); // 增加延迟到 500ms
    } catch (e) {
        console.warn('调整显示位置失败，已回退到直接居中', e);
        try { map.setCenter(position); } catch (_) {}
        // 直接打开 infoWindow 作为回退
        try { infoWindow.open(map, position); } catch(e){/* ignore */ }
    }
    
    // 添加信息窗口（创建但不立即 open，open 在上面的 setTimeout 中执行）
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

    // 点击标记打开信息窗口（备用）
    marker.on('click', function() {
        try { infoWindow.open(map, position); } catch(e){ console.warn(e); }
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