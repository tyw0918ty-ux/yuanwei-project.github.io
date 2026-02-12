mapboxgl.accessToken = "pk.eyJ1IjoiMzA4MTc1M3QiLCJhIjoiY21sazI5cGdjMDczMjNjcXp2a3Vmenh4bSJ9.epzLwGmUqUTjgrBbqaTbqg";

const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/3081753t/cmlbenhh5000z01r07jk27kzu",
    center: [-2.2442, 53.4808],
    zoom: 14
});

const foodLayerId = "manchester-food";

//Data Initialization
let favorites = JSON.parse(localStorage.getItem("mcr_food_favs")) || [];
let visited = JSON.parse(localStorage.getItem("mcr_food_visited")) || [];
let currentTab = 'favs'; 

let hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 15
});
let hideTimeout;

function startHideTimer() {
    hideTimeout = setTimeout(() => { hoverPopup.remove(); }, 300);
}

function clearHideTimer() {
    if (hideTimeout) clearTimeout(hideTimeout);
}

// Sidebar
function closeSidebar() {
    const panel = document.getElementById('restaurant-detail-panel');
    if (panel) {
        panel.style.width = "0";
        panel.classList.remove('active');
    }
}

function openSidebarContent(props, coords) {
    const panel = document.getElementById('restaurant-detail-panel');
    const container = document.getElementById('side-info');
    
    if (!panel || !container) return;

    const venueName = props.name || "Unknown Venue";
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName)}+Manchester`;
   
    let headerHtml = `
        <div class="side-info-header">
            <h2 style="font-family: 'DM Serif Display', serif; font-size: 26px; margin-top:20px; margin-bottom:10px;">${venueName}</h2>
            <hr style="border:0; border-top:1px solid #eee; margin-bottom:20px;">
        </div>
    `;

    let listHtml = `<div class="dynamic-info-list">`;
    const fields = [
        { key: 'cuisine', label: 'Cuisine', icon: '🍴' },
        { key: 'addr:street', label: 'Street', icon: '📍' },
        { key: 'addr:postcode', label: 'Postcode', icon: '📮' },
        { key: 'opening_hours', label: 'Hours', icon: '🕒' },
        { key: 'phone', label: 'Phone', icon: '📞' },
        { key: 'website', label: 'Website', icon: '🌐', isLink: true }
    ];

    fields.forEach(f => {
        const val = props[f.key] || props[`contact:${f.key}`];
        if (val) {
            listHtml += `
                <div class="info-item">
                    <strong>${f.icon} ${f.label}:</strong>
                    ${f.isLink ? `<a href="${val}" target="_blank">Visit Site</a>` : `<span>${val}</span>`}
                </div>`;
        }
    });
    listHtml += `</div>`;

    let footerHtml = `
        <div class="google-cta-block">
            <p style="margin:0 0 10px 0; font-size: 14px; color: #666;">Ready to explore more?</p>
            <a href="${googleMapsUrl}" target="_blank" class="google-maps-btn" style="text-decoration:none;">
                View on Google Maps ↗
            </a>
        </div>
    `;

    container.innerHTML = headerHtml + listHtml + footerHtml;

    panel.style.width = "360px";
    panel.classList.add('active');
}

//Favorites and Visited
function toggleFav(name) {
    const index = favorites.indexOf(name);
    if (index > -1) { favorites.splice(index, 1); } 
    else { favorites.push(name); }
    localStorage.setItem("mcr_food_favs", JSON.stringify(favorites));
    updateFavoritesUI();
    updatePopupButtons(name);
}

function toggleVisit(name) {
    const index = visited.indexOf(name);
    if (index > -1) { visited.splice(index, 1); } 
    else { visited.push(name); }
    localStorage.setItem("mcr_food_visited", JSON.stringify(visited));
    updateFavoritesUI();
    updatePopupButtons(name);
}

function updatePopupButtons(name) {
    const favBtn = document.querySelector('.pop-btn.fav-btn');
    const visBtn = document.querySelector('.pop-btn.visit-btn');
    if (favBtn) favBtn.classList.toggle('active', favorites.includes(name));
    if (visBtn) visBtn.classList.toggle('active', visited.includes(name));
}

//list
function switchUserTab(tab) {
    currentTab = tab;
    document.getElementById('tab-fav').classList.toggle('active', tab === 'favs');
    document.getElementById('tab-visit').classList.toggle('active', tab === 'visited');
    updateFavoritesUI();
}

function updateFavoritesUI() {
    const listContainer = document.getElementById('favorites-list');
    const data = (currentTab === 'favs') ? favorites : visited;
    
    if (data.length === 0) {
        listContainer.innerHTML = `<p style="color: #ccc; text-align: center; font-size: 16px; font-family: 'Lusitana', serif; margin-top:10px; font-style: italic;">Start building your Manchester foodie list!</p>`;
        return;
    }

    listContainer.innerHTML = data.map(name => `
        <div class="fav-item">
            <span>${name}</span>
            <button class="remove-btn" onclick="removeItem('${name}')">×</button>
        </div>
    `).join('');
}

function removeItem(name) {
    if (currentTab === 'favs') {
        favorites = favorites.filter(item => item !== name);
        localStorage.setItem("mcr_food_favs", JSON.stringify(favorites));
    } else {
        visited = visited.filter(item => item !== name);
        localStorage.setItem("mcr_food_visited", JSON.stringify(visited));
    }
    updateFavoritesUI();
}

map.on("load", () => {
    // Filter
    const filters = document.getElementById("filters");
    filters.addEventListener("change", () => {
        const checked = [...filters.querySelectorAll("input:checked")].map(input => input.value);
        if (checked.includes('all') || checked.length === 0) {
            map.setFilter(foodLayerId, null);
        } else {
            map.setFilter(foodLayerId, ["in", ["get", "amenity"], ["literal", checked]]);
        }
    });

    // Hover Popup
    map.on('mouseenter', foodLayerId, (e) => {
        if (hideTimeout) clearTimeout(hideTimeout);
        map.getCanvas().style.cursor = 'pointer';
        const props = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates.slice();
        const name = props.name || "Unknown Venue";
        const type = (props.amenity || "Food & Drink").toUpperCase();
        
        const isFav = favorites.includes(name) ? 'active' : '';
        const isVis = visited.includes(name) ? 'active' : '';
        
        const content = `
            <div class="hover-popup-content" onmouseenter="clearHideTimer()" onmouseleave="startHideTimer()">
                <div class="popup-type">${type}</div>
                <div class="popup-name">${name}</div>
                <div class="popup-actions">
                    <button class="pop-btn fav-btn ${isFav}" onclick="toggleFav('${name}')">❤️ Wish</button>
                    <button class="pop-btn visit-btn ${isVis}" onclick="toggleVisit('${name}')">✅ Visit</button>
                </div>
            </div>`;
        hoverPopup.setLngLat(coordinates).setHTML(content).addTo(map);
    });

    map.on('mouseleave', foodLayerId, () => {
        map.getCanvas().style.cursor = '';
        startHideTimer();
    });

    // Flyto and Open Sidebar
    map.on('click', foodLayerId, (e) => {
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates;
        map.flyTo({ center: coords, zoom: 17, essential: true });
        openSidebarContent(props, coords);
    });

    map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [foodLayerId] });
        if (features.length === 0) closeSidebar();
    });
});

//Modal
const modal = document.getElementById("about-modal");
const btn = document.getElementById("about-btn");
const span = document.querySelector(".close-btn");

if(btn) btn.onclick = function() { modal.style.display = "block"; }
if(span) span.onclick = function() { modal.style.display = "none"; }
window.onclick = function(event) { if (event.target == modal) { modal.style.display = "none"; } }

function openTab(evt, tabName) {
    let tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
    let tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) { tablinks[i].classList.remove("active"); }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
}

// Initial UI Refresh
updateFavoritesUI();

//Controls
map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            useBrowserFocus: true,
            mapboxgl: mapboxgl,
            placeholder: "Search for food in Manchester",
            proximity: {
            longitude: -2.2426,
            latitude: 53.4808
            }
        })
    );
map.addControl(new mapboxgl.NavigationControl(), "top-right"); 
map.addControl( 
new mapboxgl.GeolocateControl({ 
positionOptions: { 
enableHighAccuracy: true 
}, 
trackUserLocation: true, 
showUserHeading: true 
}), 
"top-right" 
);