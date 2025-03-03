// Google Sheet JSON URL for "Sample Fabrics"
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1OaLsjBSqyZyGsqN-qnCh-JB4E0QfUlAX_5Rgam5pIkY/gviz/tq?tqx=out:json&sheet=Sample Fabrics';

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function fetchFabrics() {
    try {
        console.log('Fetching data from:', SHEET_URL);
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const text = await response.text();
        console.log('Raw response length:', text.length);

        const json = JSON.parse(text.slice(47, -2));
        const rows = json.table.rows;
        const cols = json.table.cols;
        console.log('Parsed rows:', rows);

        const headerMap = {};
        cols.forEach((col, index) => {
            headerMap[col.label] = index;
        });

        const allHeaders = ["SKU", "Type", "Name", "Family", "Colour", "Band Width", "Roll Width", "Schedule", "Status", "Image Link", "Ordering Status"];

        const fabrics = rows.map(row => {
            const fabric = {};
            allHeaders.forEach(header => {
                const cellValue = row.c[headerMap[header]];
                fabric[header] = cellValue?.v || '';
            });
            
            if (fabric["Image Link"] && typeof fabric["Image Link"] === 'string' && fabric["Image Link"].trim() !== '') {
                try {
                    new URL(fabric["Image Link"]);
                    fabric.hasValidImage = true;
                    fabric.imageLink = fabric["Image Link"];
                } catch (e) {
                    fabric.hasValidImage = false;
                    console.warn('Invalid image URL for fabric:', fabric.Name);
                }
            } else {
                fabric.hasValidImage = false;
                console.warn('No image link provided for fabric:', fabric.Name);
            }
            
            return fabric;
        });
        
        const fabricsWithImages = fabrics.filter(fabric => fabric.hasValidImage);
        
        console.log('Fabrics with valid images:', fabricsWithImages.length, 'out of', fabrics.length);
        
        window.allFabricData = fabrics;
        displayFabrics(fabricsWithImages);
        setupFilters(fabricsWithImages);
        setupFilterButton();
    } catch (error) {
        console.error('Error fetching fabrics:', error);
        document.getElementById('fabricGrid').innerHTML = '<p>Error loading fabrics. Check console for details.</p>';
    }
}

function displayFabrics(fabrics) {
    const grid = document.getElementById('fabricGrid');
    grid.innerHTML = '';

    if (fabrics.length === 0) {
        grid.innerHTML = '<p>No matching fabrics found.</p>';
        return;
    }

    fabrics.forEach(fabric => {
        if (!fabric.hasValidImage) return;
        
        const card = document.createElement('div');
        card.className = 'fabric-card';
        if (fabric["Ordering Status"] === "Low Stock") {
            card.classList.add('low-stock');
        }

        const img = document.createElement('img');
        img.src = fabric.imageLink;
        img.alt = fabric.Name || 'Fabric';
        
        img.onerror = function() {
            console.error('Image failed to load despite validation:', this.src);
            card.remove();
        };

        const nameP = document.createElement('p');
        nameP.innerHTML = `<strong>${fabric.Name || 'Unnamed Fabric'}</strong>`;

        card.appendChild(img);
        card.appendChild(nameP);

        card.addEventListener('click', () => showFabricDetails(fabric));

        grid.appendChild(card);
    });
}

function showFabricDetails(fabric) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <img src="${fabric.imageLink}" alt="${fabric.Name}" style="max-width:100%;">
            <h2>${fabric.Name || 'Unnamed Fabric'}</h2>
            <p><strong>SKU:</strong> ${fabric.SKU || 'N/A'}</p>
            <p><strong>Type:</strong> ${fabric.Type || 'N/A'}</p>
            <p><strong>Family:</strong> ${fabric.Family || 'N/A'}</p>
            <p><strong>Colour:</strong> ${fabric.Colour || 'N/A'}</p>
            <p><strong>Band Width:</strong> ${fabric["Band Width"] || 'N/A'}</p>
            <p><strong>Roll Width:</strong> ${fabric["Roll Width"] || 'N/A'}</p>
            <p><strong>Schedule:</strong> ${fabric.Schedule || 'N/A'}</p>
            <p><strong>Status:</strong> ${fabric.Status || 'N/A'}</p>
            <p><strong>Ordering Status:</strong> ${fabric["Ordering Status"] || 'N/A'}</p>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function setupFilters(fabricsWithImages) {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const familyFilter = document.getElementById('familyFilter');
    const colourFilter = document.getElementById('colourFilter');
    const bandWidthFilter = document.getElementById('bandWidthFilter');
    const rollWidthFilter = document.getElementById('rollWidthFilter');
    const scheduleFilter = document.getElementById('scheduleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFilters = document.getElementById('resetFilters');

    const types = [...new Set(fabricsWithImages.map(f => String(f.Type || '')))].filter(Boolean);
    const families = [...new Set(fabricsWithImages.map(f => String(f.Family || '')))].filter(Boolean);
    const colours = [...new Set(fabricsWithImages.map(f => String(f.Colour || '')))].filter(Boolean);
    const bandWidths = [...new Set(fabricsWithImages.map(f => String(f["Band Width"] || '')))].filter(Boolean);
    const schedules = [...new Set(fabricsWithImages.map(f => String(f.Schedule || '')))].filter(Boolean);
    const statuses = [...new Set(fabricsWithImages.map(f => String(f.Status || '')))].filter(Boolean);

    typeFilter.multiple = true;
    familyFilter.multiple = true;
    colourFilter.multiple = true;
    bandWidthFilter.multiple = true;
    scheduleFilter.multiple = true;
    statusFilter.multiple = true;

    typeFilter.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    familyFilter.innerHTML = families.map(f => `<option value="${f}">${f}</option>`).join('');
    colourFilter.innerHTML = colours.map(c => `<option value="${c}">${c}</option>`).join('');
    bandWidthFilter.innerHTML = bandWidths.map(b => `<option value="${b}">${b}</option>`).join('');
    scheduleFilter.innerHTML = schedules.map(s => `<option value="${s}">${s}</option>`).join('');
    statusFilter.innerHTML = statuses.map(s => `<option value="${s}">${s}</option>`).join('');

    function filterFabrics() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedTypes = Array.from(typeFilter.selectedOptions).map(opt => opt.value);
        const selectedFamilies = Array.from(familyFilter.selectedOptions).map(opt => opt.value);
        const selectedColours = Array.from(colourFilter.selectedOptions).map(opt => opt.value);
        const selectedBandWidths = Array.from(bandWidthFilter.selectedOptions).map(opt => opt.value);
        const rollWidthValue = parseFloat(rollWidthFilter.value) || 0;
        const selectedSchedules = Array.from(scheduleFilter.selectedOptions).map(opt => opt.value);
        const selectedStatuses = Array.from(statusFilter.selectedOptions).map(opt => opt.value);

        const filtered = fabricsWithImages.filter(fabric => {
            const rollWidthNum = parseFloat(fabric["Roll Width"]) || 0;
            const bandWidthValue = fabric["Band Width"] ? String(fabric["Band Width"]).match(/^\d+/)?.[0] || '' : '';
            const nameMatch = fabric.Name.toLowerCase().includes(searchTerm) || fabric.SKU.toLowerCase().includes(searchTerm);

            return (
                nameMatch &&
                (selectedTypes.length === 0 || selectedTypes.includes(fabric.Type)) &&
                (selectedFamilies.length === 0 || selectedFamilies.includes(fabric.Family)) &&
                (selectedColours.length === 0 || selectedColours.includes(fabric.Colour)) &&
                (selectedBandWidths.length === 0 || selectedBandWidths.includes(bandWidthValue)) &&
                (rollWidthValue === 0 || rollWidthNum >= rollWidthValue) &&
                (selectedSchedules.length === 0 || selectedSchedules.includes(fabric.Schedule)) &&
                (selectedStatuses.length === 0 || selectedStatuses.includes(fabric.Status))
            );
        });

        displayFabrics(filtered);
    }

    function resetAllFilters() {
        searchInput.value = '';
        typeFilter.selectedIndex = -1;
        familyFilter.selectedIndex = -1;
        colourFilter.selectedIndex = -1;
        bandWidthFilter.selectedIndex = -1;
        rollWidthFilter.value = '';
        scheduleFilter.selectedIndex = -1;
        statusFilter.selectedIndex = -1;
        filterFabrics();
    }

    const debouncedFilterFabrics = debounce(filterFabrics, 300);

    searchInput.addEventListener('input', debouncedFilterFabrics);
    typeFilter.addEventListener('change', debouncedFilterFabrics);
    familyFilter.addEventListener('change', debouncedFilterFabrics);
    colourFilter.addEventListener('change', debouncedFilterFabrics);
    bandWidthFilter.addEventListener('change', debouncedFilterFabrics);
    rollWidthFilter.addEventListener('input', debouncedFilterFabrics);
    scheduleFilter.addEventListener('change', debouncedFilterFabrics);
    statusFilter.addEventListener('change', debouncedFilterFabrics);
    resetFilters.addEventListener('click', resetAllFilters);
}

function setupFilterButton() {
    const filterBtn = document.getElementById('filterBtn');
    const filterControls = document.getElementById('filterControls');
    let isHidden = false;
    let lastShownPosition = 0;
    const BUFFER_ZONE = 200; // Pixels of scroll buffer before hiding

    const debouncedScrollHandler = debounce(() => {
        const scrollPosition = window.scrollY;
        const headerHeight = document.querySelector('h1').offsetHeight;
        const controlsHeight = filterControls.offsetHeight;

        if (!isHidden && scrollPosition > (headerHeight + controlsHeight)) {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        } else if (isHidden && scrollPosition <= headerHeight) {
            filterControls.classList.remove('hidden');
            filterControls.style.position = 'sticky';
            filterControls.style.top = '0';
            filterControls.style.opacity = '1';
            filterBtn.style.display = 'none';
            isHidden = false;
        } else if (!isHidden && Math.abs(scrollPosition - lastShownPosition) > BUFFER_ZONE) {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        }
    }, 100);

    window.addEventListener('scroll', debouncedScrollHandler);

    filterBtn.addEventListener('click', () => {
        if (isHidden) {
            const scrollPosition = window.scrollY;
            filterControls.classList.remove('hidden');
            filterControls.style.position = 'absolute';
            filterControls.style.top = `${scrollPosition + 10}px`;
            filterControls.style.left = '50%';
            filterControls.style.transform = 'translateX(-50%)';
            filterControls.style.opacity = '1';
            filterControls.style.width = 'calc(100% - 2rem)';
            filterControls.style.maxWidth = '1400px';
            filterBtn.style.display = 'none';
            isHidden = false;
            lastShownPosition = scrollPosition;
        } else {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        }
    });

    filterBtn.style.display = 'none';
}

fetchFabrics();
