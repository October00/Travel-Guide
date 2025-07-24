// 在这里添加你的 JavaScript 代码
// 配置Tailwind自定义颜色和字体
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#2b6cb0',
        secondary: '#4299e1',
        accent: '#f6ad55',
        neutral: '#2d3748',
        'base-100': '#ffffff',
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif'],
        serif: ['Noto Serif SC', 'serif'],
      },
    },
  }
}

// 从后端获取地图API密钥
async function fetchMapKey() {
  try {
    console.log('准备请求地图密钥，URL:', 'http://localhost:3000/api/map-key');
    const response = await fetch('http://localhost:3000/api/map-key');
    console.log('地图密钥请求响应状态:', response.status);
    console.log('响应内容类型:', response.headers.get('content-type'));
    const responseText = await response.text();
    console.log('原始响应内容:', responseText.substring(0, 100)); // 只显示前100个字符
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`);
    }
    if (!response.headers.get('content-type').includes('application/json')) {
      throw new Error(`预期JSON响应，但收到: ${response.headers.get('content-type')}`);
    }
    const data = JSON.parse(responseText);
    return data.key;
  } catch (error) {
    console.error('获取地图密钥失败:', error);
    throw error;
  }
}

// 初始化高德地图
async function initMap() {
  try {
    const key = await fetchMapKey();
    const script = document.getElementById('amap-script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    
    script.onload = function() {
      // 直接使用加载完成的AMap对象初始化地图
      const map = new AMap.Map('map-container', {
        center: [116.397428, 39.90923],
        zoom: 13
      });
      // 加载所需插件
      AMap.plugin(['AMap.Driving', 'AMap.Walking', 'AMap.Transfer'], function() {
        // 插件加载完成后的回调
      });
    };
  } catch (error) {
    console.error('地图初始化失败:', error);
  }
}

// 获取路线详情
function fetchRouteDetails(fromCity, toCity, transportMode) {
  return new Promise((resolve, reject) => {
    // 添加10秒超时处理
    const timeoutId = setTimeout(() => {
      reject(new Error('路线查询超时，请检查网络连接'));
    }, 10000);

    if (typeof AMap === 'undefined') {
      clearTimeout(timeoutId);
      reject(new Error('地图脚本未加载'));
      return;
    }
    console.log('正在查询路线:', fromCity, '到', toCity, '交通方式:', transportMode);
    AMap.plugin(['AMap.Driving', 'AMap.Walking', 'AMap.Transfer'], () => {
      let routeService;
      try {
        switch (transportMode) {
          case 'car':
            routeService = new AMap.Driving();
            break;
          case 'plane':
            // AMap.Transfer不支持飞机类型，使用自定义处理
            clearTimeout(timeoutId);
            resolve({transportMode: 'plane', message: '飞机路线暂不支持详细查询'});
            return;
          case 'train':
            routeService = new AMap.Transfer({type: 'train'});
            break;
          case 'high-speed':
            routeService = new AMap.Transfer({type: 'train', policy: 'LEAST_TIME'});
            break;
          default:
            routeService = new AMap.Walking();
        }
        if (!routeService) {
          clearTimeout(timeoutId);
          reject(new Error('不支持的交通方式'));
          return;
        }
        routeService.search(fromCity, toCity, (status, result) => {
          clearTimeout(timeoutId);
          console.log('路线查询结果:', status, result);
          if (status === 'complete') {
            if (result.routes && result.routes.length > 0) {
              resolve(result);
            } else {
              reject(new Error('未找到路线数据'));
            }
          } else {
            reject(new Error(`路线查询失败: ${result.info || '未知错误'}`));
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('路线查询初始化失败:', error);
        reject(new Error(`路线: ${error.message}`));
      }
    });
  });
}

// 获取景点推荐
async function fetchAttractions(city) {
  try {
    // 添加10秒超时处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const key = await fetchMapKey();
    console.log('正在查询景点:', city);
    const response = await fetch(
      `https://restapi.amap.com/v3/place/text?key=${key}&keywords=景点&city=${city}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    console.log('景点API响应状态:', response.status);
    const data = await response.json();
    console.log('景点API响应数据:', data);
    if (data.status === '1') {
      if (data.pois && data.pois.length > 0) {
        return data.pois;
      } else {
        throw new Error('未找到景点数据');
      }
    } else {
      throw new Error(`景点查询失败: ${data.info || '未知错误'}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('景点查询超时，请检查网络连接');
    }
    console.error('获取景点失败:', error);
    throw new Error(`景点: ${error.message}`);
  }
}

// 生成行程规划
function generateItinerary(formData) {
  const { fromCity, toCity, departureDate, returnDate, travelers, transportMode } = formData;
  return Promise.all([
    fetchRouteDetails(fromCity, toCity, transportMode),
    fetchAttractions(toCity)
  ])
    .then(results => {
      const [routeDetails, attractions] = results;
      const itinerary = {
        fromCity,
        toCity,
        departureDate,
        returnDate,
        travelers,
        transportMode,
        routeDetails,
        attractions
      };
      return itinerary;
  
    })
    .catch(error => {
      console.error('行程生成错误:', error);
      if (error.message.includes('景点')) {
        alert('获取景点数据失败，请重试');
      } else if (error.message.includes('路线')) {
        alert('获取路线信息失败，请重试');
      } else {
        alert('行程生成失败: ' + error.message);
      }
      throw error; // 重新抛出错误以确保finally能正确处理
    });
}

// 显示行程规划
function displayItinerary(itinerary) {
  try {
    // 隐藏空状态，显示结果区域
    document.getElementById('empty-results').classList.add('hidden');
    document.getElementById('generated-results').classList.remove('hidden');
    
    // 更新行程标题和日期
    document.getElementById('trip-title').textContent = `${itinerary.fromCity} 到 ${itinerary.toCity} 行程规划`;
    document.getElementById('trip-dates').textContent = `${itinerary.departureDate} - ${itinerary.returnDate}`;
    
    // 更新行程概览
    const tripDays = Math.ceil((new Date(itinerary.returnDate) - new Date(itinerary.departureDate)) / (1000 * 60 * 60 * 24)) + 1;
    document.getElementById('trip-days').textContent = `${tripDays}天${tripDays-1}晚`;
    
    // 添加路线详情
    const routeDetailsDiv = document.createElement('div');
    routeDetailsDiv.className = 'mt-6 bg-white rounded-lg p-4 shadow-sm';
    routeDetailsDiv.innerHTML = `
      <h4 class="font-serif font-bold text-lg text-gray-800 mb-3">路线详情</h4>
      <pre class="text-sm bg-gray-50 p-3 rounded">${JSON.stringify(itinerary.routeDetails, null, 2)}</pre>
    `;
    document.getElementById('generated-results').appendChild(routeDetailsDiv);

    // 更新景点列表
  } catch (error) {
    console.error('显示行程失败:', error);
    throw new Error(`显示行程: ${error.message}`);
  }
    let attractionsList = document.querySelector('#generated-results ul');
    if (!attractionsList) {
      // 如果景点列表容器不存在，则创建它
      const attractionsDiv = document.createElement('div');
      attractionsDiv.className = 'mt-6';
      attractionsDiv.innerHTML = '<h4 class="font-serif font-bold text-lg text-gray-800 mb-3">景点推荐</h4><ul></ul>';
      document.getElementById('generated-results').appendChild(attractionsDiv);
      attractionsList = attractionsDiv.querySelector('ul');
    }
    attractionsList.innerHTML = itinerary.attractions.map(attraction => 
      `<li class="flex items-start mb-4">
        <i class="fa fa-map-marker text-primary mt-1 mr-3"></i>
        <div>
          <h5 class="font-medium">${attraction.name}</h5>
          <p class="text-sm text-gray-600">${attraction.address || '地址未知'}</p>
        </div>
      </li>`
    ).join('');
}

// 表单提交处理
const submitButton = document.querySelector('#trip-form button[type="submit"]');

// 初始禁用提交按钮，等待地图加载
submitButton.disabled = true;
submitButton.textContent = '加载中...';

// 检查地图是否加载完成
function checkMapLoaded() {
  if (typeof AMap !== 'undefined') {
    submitButton.disabled = false;
    submitButton.innerHTML = '生成旅行计划 <i class="fa fa-arrow-right ml-2"></i>';
    return;
  }
  // 继续检查
  setTimeout(checkMapLoaded, 500);
}

// 开始检查
checkMapLoaded();

document.getElementById('trip-form').addEventListener('submit', event => {
  event.preventDefault();
  // 显示加载状态
  submitButton.disabled = true;
  submitButton.textContent = '生成中...';

  const formData = {
    fromCity: document.getElementById('from-city').value,
    toCity: document.getElementById('to-city').value,
    departureDate: document.getElementById('departure-date').value,
    returnDate: document.getElementById('return-date').value,
    travelers: document.getElementById('travelers').value,
    transportMode: document.querySelector('input[name="transport"]:checked').value
  };

  // 表单验证
  const departure = new Date(formData.departureDate);
  const returnDate = new Date(formData.returnDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!formData.fromCity.trim()) {
    alert('请输入出发城市');
    submitButton.disabled = false;
    submitButton.innerHTML = '生成旅行计划 <i class="fa fa-arrow-right ml-2"></i>';
    return;
  }

  if (!formData.toCity.trim()) {
    alert('请输入目的城市');
    submitButton.disabled = false;
    submitButton.innerHTML = '生成旅行计划 <i class="fa fa-arrow-right ml-2"></i>';
    return;
  }

  if (isNaN(departure.getTime()) || departure < today) {
    alert('请选择有效的出发日期（不能早于今天）');
    submitButton.disabled = false;
    submitButton.innerHTML = '生成旅行计划 <i class="fa fa-arrow-right ml-2"></i>';
    return;
  }

  if (isNaN(returnDate.getTime()) || returnDate <= departure) {
    alert('请选择有效的返回日期（必须晚于出发日期）');
    submitButton.disabled = false;
    submitButton.innerHTML = '生成旅行计划 <i class="fa fa-arrow-right ml-2"></i>';
    return;
  }

  // 添加安全超时，确保按钮总能重置
  const safetyTimeout = setTimeout(() => {
    submitButton.disabled = false;
    submitButton.innerHTML = '生成旅行计划 <i class="fa fa-arrow-right ml-2"></i>';
    alert('请求超时，请重试');
  }, 15000);

  generateItinerary(formData)
    .then(itinerary => {
      clearTimeout(safetyTimeout);
      displayItinerary(itinerary);
    })
    .catch(error => {
      clearTimeout(safetyTimeout);
      console.error('生成行程失败:', error);
      if (error.message.includes('景点:')) {
        alert(`获取景点信息失败: ${error.message.replace('景点:', '')}`);
      } else if (error.message.includes('路线:')) {
        alert(`获取路线信息失败: ${error.message.replace('路线:', '')}`);
      } else if (error.message.includes('显示行程:')) {
        alert(`行程显示失败: ${error.message.replace('显示行程:', '')}`);
      } else {
        alert(`生成行程失败: ${error.message}`);
      }
    })
    .finally(() => {
      clearTimeout(safetyTimeout);
      // 恢复按钮状态
      submitButton.disabled = false;
      submitButton.innerHTML = '生成旅行计划 <i class="fa fa-arrow-right ml-2"></i>';
    });
});

// 初始化地图
window.onload = initMap;