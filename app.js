/**
 * Procedural Typesetting Engine
 * Author: Professor / Senior Dev
 * Focus: Performance, Gestalt UI, Procedural Müller-Brockmann Grid Systems
 */

class TypesettingEngine {
    constructor() {
        this.workspace = document.getElementById('workspace');
        this.canvas = document.getElementById('canvas');
        this.docContainer = document.getElementById('document-container');
        
        // Workspace Pan/Zoom State
        this.scale = 1;
        this.translateX = -400; // Initial center offset
        this.translateY = -300;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;

        this.initWorkspace();
        this.initUIListeners();
        this.renderPages();
        this.buildCustomStylesUI();
    }

    // 1. Workspace Interaction (Trackpad / Mousewheel)
    initWorkspace() {
        this.updateCanvasTransform();

        // Pan via drag
        this.workspace.addEventListener('mousedown', (e) => {
            this.isPanning = true;
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
        });

        window.addEventListener('mouseup', () => this.isPanning = false);
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            this.translateX = e.clientX - this.startX;
            this.translateY = e.clientY - this.startY;
            this.updateCanvasTransform();
        });

        // Zoom via Trackpad / Ctrl+Scroll
        this.workspace.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                // Zoom
                const zoomFactor = 0.05;
                const delta = e.deltaY < 0 ? 1 : -1;
                this.scale += delta * zoomFactor;
                this.scale = Math.max(0.1, Math.min(this.scale, 5)); // Limit zoom
            } else {
                // Pan
                this.translateX -= e.deltaX;
                this.translateY -= e.deltaY;
            }
            this.updateCanvasTransform();
        }, { passive: false });
    }

    updateCanvasTransform() {
        this.canvas.style.transform = `translate(\({this.translateX}px,\){this.translateY}px) scale(${this.scale})`;
    }

    // 2. UI Event Listeners & CSS Variable Updates
    initUIListeners() {
        const updateCSSVar = (id, varName) => {
            document.getElementById(id).addEventListener('input', (e) => {
                let val = e.target.value;
                if (e.target.type === 'number' && !varName.includes('cols') && !varName.includes('rows')) val += 'mm'; 
                document.documentElement.style.setProperty(varName, val);
            });
        };

        // Document Setup per References[cite: 1][cite: 2][cite: 6]
        document.getElementById('doc-preset').addEventListener('change', (e) => {
            const sizes = { 'A4': ['210mm', '297mm'], 'A5': ['148mm', '210mm'], 'A6': ['105mm', '148mm'] };
            document.documentElement.style.setProperty('--doc-width', sizes[e.target.value][0]);
            document.documentElement.style.setProperty('--doc-height', sizes[e.target.value][1]);
        });

        updateCSSVar('margin-top', '--m-top');
        updateCSSVar('margin-bottom', '--m-bottom');
        updateCSSVar('margin-inside', '--m-inside');
        updateCSSVar('margin-outside', '--m-outside');
        
        document.getElementById('col-count').addEventListener('input', (e) => {
            document.documentElement.style.setProperty('--grid-cols', e.target.value);
        });
        updateCSSVar('col-gutter', '--grid-gutter');

        // Guides
        document.getElementById('guide-rows').addEventListener('input', (e) => document.documentElement.style.setProperty('--guide-rows', e.target.value));
        document.getElementById('guide-cols').addEventListener('input', (e) => document.documentElement.style.setProperty('--guide-cols', e.target.value));
        updateCSSVar('guide-rgutter', '--guide-rgutter');
        updateCSSVar('guide-cgutter', '--guide-cgutter');

        document.getElementById('page-count').addEventListener('change', () => this.renderPages());

        // Typography Settings UI Logic
        const autoStyleCheck = document.getElementById('auto-styles');
        const autoSec = document.getElementById('auto-style-section');
        const customSec = document.getElementById('custom-style-section');

        autoStyleCheck.addEventListener('change', (e) => {
            if(e.target.checked) {
                autoSec.style.display = 'block';
                customSec.style.display = 'none';
            } else {
                autoSec.style.display = 'none';
                customSec.style.display = 'block';
            }
        });

        // Setup Drag & Drop for Fonts
        this.setupDropZone(document.getElementById('global-font-drop'), 'GlobalFont');

        // Export System[cite: 7]
        document.getElementById('btn-export').addEventListener('click', () => this.exportPDF());
    }

    // 3. Custom Style Matrix Generation
    buildCustomStylesUI() {
        const customSec = document.getElementById('custom-style-section');
        const styles = ['H1', 'H2', 'H3', 'Para', 'Bullet', 'PageNum'];
        
        styles.forEach(style => {
            const row = document.createElement('div');
            row.className = 'custom-style-row';
            
            // Name[cite: 5]
            const name = document.createElement('h4');
            name.innerText = style;
            
            // D&D
            const drop = document.createElement('div');
            drop.className = 'drop-zone';
            drop.style.padding = '5px';
            drop.style.flex = '1';
            drop.innerText = 'Drop Font';
            this.setupDropZone(drop, `Font_${style}`);

            // Edit Btn
            const btnEdit = document.createElement('button');
            btnEdit.className = 'style-btn';
            btnEdit.innerText = 'Edit';

            // Compare A/B (Audio plugin inspired)
            const btnAB = document.createElement('button');
            btnAB.className = 'style-btn';
            btnAB.innerText = 'A/B';
            btnAB.addEventListener('click', () => btnAB.classList.toggle('active'));

            // Assign
            const btnAssign = document.createElement('button');
            btnAssign.className = 'style-btn active';
            btnAssign.innerText = 'Assign';

            row.append(name, drop, btnEdit, btnAB, btnAssign);
            customSec.appendChild(row);
        });
    }

    // 4. File API Font Handling
    setupDropZone(zone, fontFamilyName) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith('.ttf') || file.name.endsWith('.woff2'))) {
                const fontUrl = URL.createObjectURL(file);
                const fontFace = new FontFace(fontFamilyName, `url(${fontUrl})`);
                fontFace.load().then(loadedFace => {
                    document.fonts.add(loadedFace);
                    zone.innerText = file.name;
                    // Apply to document dynamically
                    document.documentElement.style.setProperty(`--font-${fontFamilyName.toLowerCase()}`, fontFamilyName);
                });
            } else {
                alert("Please drop a valid .ttf or .woff2 file.");
            }
        });
    }

    // 5. Procedural Rendering Engine
    renderPages() {
        const count = parseInt(document.getElementById('page-count').value) || 1;
        this.docContainer.innerHTML = ''; // clear

        // Generate DOM pages representing physical sheets
        for (let i = 0; i < count; i++) {
            const page = document.createElement('div');
            page.className = 'page';
            
            const content = document.createElement('div');
            content.className = 'page-content';
            
            // Dummy procedural text representing layout
            content.innerHTML = `
