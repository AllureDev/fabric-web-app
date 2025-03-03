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

    const types = [...new Set(fabricsWithImages.map(f => String(f.Type || '')))].filter(Boolean);
    const families = [...new Set(fabricsWithImages.map(f => String(f.Family || '')))].filter(Boolean);
    const colours = [...new Set(fabricsWithImages.map(f => String(f.Colour || '')))].filter(Boolean);
    const bandWidths = [...new Set(fabricsWithImages.map(f => String(f["Band Width"] || '')))].filter(Boolean);
    const schedules = [...new Set(fabricsWithImages.map(f => String(f.Schedule || '')))].filter(Boolean);
    const statuses = [...new Set(fabricsWithImages.map(f => String(f.Status || '')))].filter(Boolean);

    typeFilter.innerHTML = '<option value="">All Types</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
    familyFilter.innerHTML = '<option value="">All Families</option>' + families.map(f => `<option value="${f}">${f}</option>`).join('');
    colourFilter.innerHTML = '<option value="">All Colours</option>' + colours.map(c => `<option value="${c}">${c}</option>`).join('');
    bandWidthFilter.innerHTML = '<option value="">All Band Widths</option>' + bandWidths.map(b => `<option value="${b}">${b}</option>`).join('');
    scheduleFilter.innerHTML = '<option value="">All Schedules</option>' + schedules.map(s => `<option value="${s}">${s}</option>`).join('');
    statusFilter.innerHTML = '<option value="">All Statuses</option>' + statuses.map(s => `<option value="${s}">${s}</option>`).join('');

    function filterFabrics() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedType = typeFilter.value;
        const selectedFamily = familyFilter.value;
        const selectedColour = colourFilter.value;
        const selectedBandWidth = bandWidthFilter.value;
        const rollWidthValue = parseFloat(rollWidthFilter.value) || 0;
        const selectedSchedule = scheduleFilter.value;
        const selectedStatus = statusFilter.value;

        const filtered = fabricsWithImages.filter(fabric => {
            const rollWidthNum = parseFloat(fabric["Roll Width"]) || 0;
            const bandWidthValue = fabric["Band Width"] ? String(fabric["Band Width"]).match(/^\d+/)?.[0] || '' : '';
            const nameMatch = fabric.Name.toLowerCase().includes(searchTerm) || fabric.SKU.toLowerCase().includes(searchTerm);

            return (
                nameMatch &&
                (!selectedType || fabric.Type === selectedType) &&
                (!selectedFamily || fabric.Family === selectedFamily) &&
                (!selectedColour || fabric.Colour === selectedColour) &&
                (!selectedBandWidth || bandWidthValue === selectedBandWidth) &&
                (rollWidthValue === 0 || rollWidthNum >= rollWidthValue) &&
                (!selectedSchedule || fabric.Schedule === selectedSchedule) &&
                (!selectedStatus || fabric.Status === selectedStatus)
            );
        });

        displayFabrics(filtered);
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
}

function setupFilterButton() {
    const filterBtn = document.getElementById('filterBtn');
    const filterControls = document.getElementById('filterControls');
    let isHidden = false;

    // Hide filters when scrolling past them
    window.addEventListener('scroll', () => {
        const controlsBottom = filterControls.getBoundingClientRect().bottom;
        if (controlsBottom < 0 && !isHidden) {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        }
    });

    // Toggle filter panel
    filterBtn.addEventListener('click', () => {
        if (isHidden) {
            filterControls.classList.remove('hidden');
            filterBtn.style.display = 'none';
            isHidden = false;
        } else {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        }
    });

    // Initially hide button
    filterBtn.style.display = 'none';
}

fetchFabrics();
