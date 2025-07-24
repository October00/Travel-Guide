// 初始化高德地图
window.onload = function() {
    var map = new AMap.Map('mapContainer', {
        zoom: 10,
        center: [116.397428, 39.90923]
    });
}

// 获取路线详情
function fetchRouteDetails(start, end, mode) {
    return fetch(`https://restapi.amap.com/v3/direction/${mode}?origin=${start}&destination=${end}&key=${process.env.AMAP_MAPS_API_KEY}`)
        .then(response => response.json())
        .then(data => data);
}

// 获取景点推荐
function fetchAttractions(location) {
    return fetch(`https://restapi.amap.com/v5/place/text?key=${process.env.AMAP_MAPS_API_KEY}&keywords=景点&location=${location}`)
        .then(response => response.json())
        .then(data => data.pois);
}

// ... existing code ...

// 生成行程规划
function generateItinerary(formData) {
    const { start, end, travelMode, startDate, endDate, travelers } = formData;
    Promise.all([
        fetchRouteDetails(start, end, travelMode),
        fetchAttractions(end)
    ]).then(results => {
        const routeDetails = results[0];
        const attractions = results[1];
        const itinerary = {
            start,
            end,
            startDate,
            endDate,
            travelMode,
            travelers,
            route: routeDetails,
            attractions
        };
        displayItinerary(itinerary);
    }).catch(error => {
        console.error('Error generating itinerary:', error);
    });
}

// 显示行程规划
function displayItinerary(itinerary) {
    const itineraryDiv = document.getElementById('itinerary');
    itineraryDiv.innerHTML = `
        <h2>行程规划</h2>
        <p>出发地: ${itinerary.start}</p>
        <p>目的地: ${itinerary.end}</p>
        <p>出发日期: ${itinerary.startDate}</p>
        <p>结束日期: ${itinerary.endDate}</p>
        <p>出行方式: ${itinerary.travelMode}</p>
        <p>旅行者姓名: ${itinerary.travelers}</p>
        <h3>路线详情</h3>
        <pre>${JSON.stringify(itinerary.route, null, 2)}</pre>
        <h3>景点推荐</h3>
        <ul>
            ${itinerary.attractions.map(attraction => `<li>${attraction.name} - ${attraction.address}</li>`).join('')}
        </ul>
    `;
}

// 处理表单提交
document.getElementById('itineraryForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    const travelMode = document.getElementById('travelMode').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const travelerName = document.getElementById('travelerName').value;
    generateItinerary(start, end, startDate, endDate, travelMode, travelerName);
});