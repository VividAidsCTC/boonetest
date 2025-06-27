// Global variables
let scene, camera, renderer;
let kelp = [];
let waveSpeed = 1.2;
let waveIntensity = .6;
let currentDirection = 45;
let time = 0;

// Camera controls
let targetRotationX = 0, targetRotationY = 0;
let rotationX = 0, rotationY = 0;
let distance = 30;
let isMouseDown = false;

// Multiple kelp model configurations
const KELP_MODELS = [
    {
        url: 'https://raw.githubusercontent.com/VividAidsCTC/boonetest/main/nouveaukelp4.glb',
        count: 100,
        color: 0x735F1D, // Dark green-brown
        scale: { min: 4, max: 20 },
        name: 'Large Kelp',
        opacity: 0.85
    },
    {
        url: 'https://raw.githubusercontent.com/VividAidsCTC/boonetest/main/smallkelp.glb',
        count: 75,
        color: 0x5D4F17, // Slightly different shade
        scale: { min: 2, max: 12 },
        name: 'Small Kelp',
        opacity: 0.80
    }
];

let loadedModels = {}; // Store loaded GLTF templates
let loadedCount = 0;

// Add these variables to your global variables section
let floorTextures = {
    diffuse: null,
    normal: null,
    roughness: null,
    displacement: null
};
let textureLoader = new THREE.TextureLoader();

// Replace your existing floor creation code in initializeScene() with this enhanced version
function createTexturedFloor() {
    log('Creating textured seafloor...');
    
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000, 256, 256); // Higher resolution for displacement
    
    // Default material (will be updated when textures load)
    let floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x302114, // Richer saddle brown
        shininess: 2,
        specular: 0x332211
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true; // Enable shadow receiving
    scene.add(floor);
    
    // Store reference for texture updates
    window.seafloor = floor;
    
    return floor;
}

// Function to load and apply textures to the ground plane
function loadGroundTextures(texturePaths) {
    log('Loading ground textures...');
    
    const loadPromises = [];
    
    // Load diffuse/albedo texture
    if (texturePaths.diffuse) {
        const diffusePromise = new Promise((resolve, reject) => {
            textureLoader.load(
                texturePaths.diffuse,
                (texture) => {
                    // Configure texture settings
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(8, 8); // Adjust repetition as needed
                    floorTextures.diffuse = texture;
                    log('Diffuse texture loaded successfully');
                    resolve(texture);
                },
                (progress) => log(`Diffuse texture loading: ${Math.round((progress.loaded/progress.total)*100)}%`),
                (error) => {
                    log('Error loading diffuse texture: ' + error);
                    reject(error);
                }
            );
        });
        loadPromises.push(diffusePromise);
    }
    
    // Load normal map
    if (texturePaths.normal) {
        const normalPromise = new Promise((resolve, reject) => {
            textureLoader.load(
                texturePaths.normal,
                (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(8, 8);
                    floorTextures.normal = texture;
                    log('Normal map loaded successfully');
                    resolve(texture);
                },
                (progress) => log(`Normal map loading: ${Math.round((progress.loaded/progress.total)*100)}%`),
                (error) => {
                    log('Error loading normal map: ' + error);
                    reject(error);
                }
            );
        });
        loadPromises.push(normalPromise);
    }
    
    // Load roughness map
    if (texturePaths.roughness) {
        const roughnessPromise = new Promise((resolve, reject) => {
            textureLoader.load(
                texturePaths.roughness,
                (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(8, 8);
                    floorTextures.roughness = texture;
                    log('Roughness map loaded successfully');
                    resolve(texture);
                },
                (progress) => log(`Roughness map loading: ${Math.round((progress.loaded/progress.total)*100)}%`),
                (error) => {
                    log('Error loading roughness map: ' + error);
                    reject(error);
                }
            );
        });
        loadPromises.push(roughnessPromise);
    }
    
    // Load displacement map
    if (texturePaths.displacement) {
        const displacementPromise = new Promise((resolve, reject) => {
            textureLoader.load(
                texturePaths.displacement,
                (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(8, 8);
                    floorTextures.displacement = texture;
                    log('Displacement map loaded successfully');
                    resolve(texture);
                },
                (progress) => log(`Displacement map loading: ${Math.round((progress.loaded/progress.total)*100)}%`),
                (error) => {
                    log('Error loading displacement map: ' + error);
                    reject(error);
                }
            );
        });
        loadPromises.push(displacementPromise);
    }
    
    // Wait for all textures to load, then update the material
    Promise.allSettled(loadPromises).then(() => {
        updateFloorMaterial();
    });
}

// Function to update the floor material with loaded textures
function updateFloorMaterial() {
    if (!window.seafloor) {
        log('Error: Seafloor mesh not found');
        return;
    }
    
    log('Updating floor material with textures...');
    
    // Create new material with textures
    const materialProps = {
        color: floorTextures.diffuse ? 0xffffff : 0x302114, // White if using diffuse texture, brown otherwise
        shininess: 5,
        specular: 0x333333
    };
    
    // Apply textures if they exist
    if (floorTextures.diffuse) {
        materialProps.map = floorTextures.diffuse;
    }
    
    if (floorTextures.normal) {
        materialProps.normalMap = floorTextures.normal;
        materialProps.normalScale = new THREE.Vector2(0.5, 0.5); // Adjust normal intensity
    }
    
    if (floorTextures.roughness) {
        // For MeshPhongMaterial, we can simulate roughness by adjusting shininess
        materialProps.shininess = 1; // Lower shininess for rougher appearance
    }
    
    if (floorTextures.displacement) {
        materialProps.displacementMap = floorTextures.displacement;
        materialProps.displacementScale = 0.5; // Adjust displacement intensity
    }
    
    // Create new material
    const newMaterial = new THREE.MeshPhongMaterial(materialProps);
    
    // Replace the old material
    window.seafloor.material.dispose(); // Clean up old material
    window.seafloor.material = newMaterial;
    
    log('Floor material updated with textures');
}

// Utility function to change texture repetition
function setTextureRepeat(repeatX, repeatY) {
    Object.values(floorTextures).forEach(texture => {
        if (texture) {
            texture.repeat.set(repeatX, repeatY);
        }
    });
    log(`Texture repeat set to ${repeatX}x${repeatY}`);
}

// Example usage function - call this to load your textures
function loadSeafloorTextures() {
    // Example texture paths - replace with your actual texture URLs
    const texturePaths = {  
        diffuse: 'https://raw.githubusercontent.com/VividAidsCTC/boonetest/main/textures/Ground059_1K-JPG_Color.jpg', // Main color/albedo texture
        normal: 'https://raw.githubusercontent.com/VividAidsCTC/boonetest/main/textures/Ground059_1K-JPG_NormalGL.jpg', // Normal map for surface detail
        roughness: 'https://raw.githubusercontent.com/VividAidsCTC/boonetest/main/textures/Ground059_1K-JPG_Roughness.jpg', // Roughness map
        displacement: 'https://raw.githubusercontent.com/VividAidsCTC/boonetest/main/textures/Ground059_1K-JPG_Displacement.jpg', // Height/displacement map
        ao: 'https://raw.githubusercontent.com/VividAidsCTC/boonetest/main/textures/Ground059_1K-JPG_AmbientOcclusion.jpg'
    };
    
    loadGroundTextures(texturePaths);
}

// Debug logging function
function log(message) {
    console.log(message);
    const debugDiv = document.getElementById('debug');
    if (debugDiv) {
        debugDiv.innerHTML += message + '<br>';
    }
}

// Wait for DOM and start the application
document.addEventListener('DOMContentLoaded', function() {
    log('DOM loaded, initializing multi-kelp forest...');

    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded');
        return;
    }
    
    initializeScene();
    setupControls();

    // Try to load all GLTF models first, fallback to cylinders if they fail
    setTimeout(() => {
        loadAllKelpModels();
    }, 500);
});

function initializeScene() {
    log('Initializing Three.js scene...');

    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(120, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create blue gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    const context = canvas.getContext('2d');
    context.fillStyle = '#3c7878';
    context.fillRect(0, 0, 1000, 1000);

    const gradientTexture = new THREE.CanvasTexture(canvas);
    scene.background = gradientTexture;

    const container = document.getElementById('container');
    container.appendChild(renderer.domElement);

    // Brighter ocean lighting - warmer tones to preserve brown seafloor
    const ambientLight = new THREE.AmbientLight(0x6699bb, 0.3); // Less blue, more neutral
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xaaccdd, 0.8); // Lighter blue-white
    sunLight.position.set(0, 50, 10);
    scene.add(sunLight);

    const rimLight1 = new THREE.DirectionalLight(0x7799cc, 0.3); // Warmer blue
    rimLight1.position.set(20, 20, 0);
    scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0x6688bb, 0.25); // Even warmer
    rimLight2.position.set(-20, 15, 0);
    scene.add(rimLight2);

    // Add a warm fill light specifically for the seafloor
    const floorLight = new THREE.DirectionalLight(0x7aacbe, 0.2); // Blue tone
    floorLight.position.set(0, -30, 0); // From below to light the floor
    scene.add(floorLight);

    const floor = createTexturedFloor();
    
    // Load seafloor textures after a delay
    setTimeout(() => {
        loadSeafloorTextures();
    }, 1000);
}

function loadAllKelpModels() {
    log('Loading all kelp models...');

    if (typeof THREE.GLTFLoader === 'undefined') {
        log('ERROR: GLTFLoader not available, using fallback kelp');
        createFallbackKelp();
        return;
    }

    const loader = new THREE.GLTFLoader();
    loadedCount = 0;

    // Load each kelp model
    KELP_MODELS.forEach((kelpModel, index) => {
        log(`Loading ${kelpModel.name}...`);
        
        loader.load(
            kelpModel.url,
            function(gltf) {
                log(`${kelpModel.name} GLTF model loaded successfully`);
                
                // Store the loaded template
                loadedModels[index] = {
                    template: gltf.scene,
                    config: kelpModel
                };

                // Process the template
                const template = gltf.scene;

                // Compute overall bounding box for the entire model
                const box = new THREE.Box3().setFromObject(template);
                const size = new THREE.Vector3();
                box.getSize(size);

                log(`${kelpModel.name} size: X=${size.x.toFixed(3)}, Y=${size.y.toFixed(3)}, Z=${size.z.toFixed(3)}`);

                // Apply kelp material to all meshes in this model
                template.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        // Ensure geometry has position attributes we can modify
                        child.geometry.computeBoundingBox();
                        const geometry = child.geometry;
                        
                        // Store original positions for deformation
                        const positions = geometry.attributes.position.array.slice();
                        geometry.userData.originalPositions = positions;
                        
                        // Calculate bounding box for height calculations
                        const bbox = geometry.boundingBox;
                        geometry.userData.minY = bbox.min.y;
                        geometry.userData.maxY = bbox.max.y;
                        geometry.userData.height = bbox.max.y - bbox.min.y;
                        
                        // Apply kelp material with model-specific color
                        const kelpMaterial = new THREE.MeshPhongMaterial({
                            color: kelpModel.color,
                            transparent: true,
                            opacity: kelpModel.opacity,
                            shininess: 10
                        });
                        child.material = kelpMaterial;
                        
                        log(`Prepared ${kelpModel.name} mesh for vertex deformation: height=${geometry.userData.height.toFixed(2)}`);
                    }
                });

                // Position template so bottom touches ground
                template.position.y = -1;

                loadedCount++;
                
                // Check if all models are loaded
                if (loadedCount === KELP_MODELS.length) {
                    createKelpInstances();
                }
            },
            function(progress) {
                if (progress.total > 0) {
                    log(`${kelpModel.name} loading progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
                }
            },
            function(error) {
                log(`ERROR loading ${kelpModel.name} GLTF: ${error.message}`);
                
                loadedCount++;
                
                // Check if all models are processed (even failed ones)
                if (loadedCount === KELP_MODELS.length) {
                    // Create instances with whatever models loaded successfully
                    if (Object.keys(loadedModels).length > 0) {
                        createKelpInstances();
                    } else {
                        log('No models loaded successfully, using fallback');
                        createFallbackKelp();
                    }
                }
            }
        );
    });
}

function createKelpInstances() {
    log('Creating kelp instances from loaded models...');

    // Create instances for each loaded model
    Object.keys(loadedModels).forEach(modelIndex => {
        const { template, config } = loadedModels[modelIndex];
        
        log(`Creating ${config.count} instances of ${config.name}...`);

        for(let i = 0; i < config.count; i++) {
            const kelpInstance = template.clone();

            // Position kelp on the seafloor with some clustering by type
            const areaOffset = parseInt(modelIndex) * 20; // Offset different types slightly
            kelpInstance.position.x = (Math.random() - 0.5) * 175 + (Math.random() - 0.5) * areaOffset;
            kelpInstance.position.z = (Math.random() - 0.5) * 175 + (Math.random() - 0.5) * areaOffset;
            kelpInstance.position.y = -1; // Place on seafloor level

            // Scale based on model configuration
            const scale = config.scale.min + Math.random() * (config.scale.max - config.scale.min);
            kelpInstance.scale.setScalar(scale);

            // Random rotation only
            kelpInstance.rotation.y = Math.random() * Math.PI * 2;

            // Store animation data with model-specific variations
            const typeVariation = parseInt(modelIndex) * 0.3; // Different animation for each type
            kelpInstance.userData = {
                originalX: kelpInstance.position.x,
                originalZ: kelpInstance.position.z,
                originalY: kelpInstance.position.y,
                offset1: Math.random() * Math.PI * 2 + typeVariation,
                offset2: Math.random() * Math.PI * 2 + typeVariation,
                offset3: Math.random() * Math.PI * 2 + typeVariation,
                freq1: 0.8 + Math.random() * 0.6,
                freq2: 1.1 + Math.random() * 0.8,
                freq3: 0.5 + Math.random() * 0.4,
                amplitude1: 0.8 + Math.random() * 0.6,
                amplitude2: 0.6 + Math.random() * 0.5,
                amplitude3: 0.4 + Math.random() * 0.3,
                isGLTF: true,
                modelType: config.name
            };

            // Prepare cloned geometries for vertex deformation
            kelpInstance.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    // Clone geometry so each instance can be deformed independently
                    child.geometry = child.geometry.clone();
                    // Copy userData from the original template mesh
                    template.traverse((originalChild) => {
                        if (originalChild.isMesh && originalChild.geometry && 
                            originalChild.geometry.userData.originalPositions &&
                            originalChild.name === child.name) {
                            child.geometry.userData.originalPositions = originalChild.geometry.userData.originalPositions.slice();
                            child.geometry.userData.minY = originalChild.geometry.userData.minY;
                            child.geometry.userData.maxY = originalChild.geometry.userData.maxY;
                            child.geometry.userData.height = originalChild.geometry.userData.height;
                            return; // Found match, exit traverse
                        }
                    });
                }
            });

            scene.add(kelpInstance);
            kelp.push(kelpInstance);
        }
        
        log(`Created ${config.count} instances of ${config.name}`);
    });

    log(`Total kelp instances created: ${kelp.length}`);
    startAnimation();
}

function createFallbackKelp() {
    log('Creating fallback cylinder kelp...');

    for(let i = 0; i < 35; i++) {
        // Base kelp dimensions
        const baseKelpHeight = 20;
        const baseBottomRadius = 0.4;
        const baseTopRadius = 0.2;

        // Scale between 0.75x and 1.5x the original size
        const scale = 0.75 + Math.random() * 0.75;
        const kelpHeight = baseKelpHeight * scale;
        const bottomRadius = baseBottomRadius * scale;
        const topRadius = baseTopRadius * scale;

        // Create custom geometry for bending kelp
        const segments = 20;
        const radialSegments = 8;

        const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, kelpHeight, radialSegments, segments);

        // Store original positions for deformation
        const positions = geometry.attributes.position.array.slice();
        geometry.userData.originalPositions = positions;
        geometry.userData.height = kelpHeight;

        // Brighter, less transparent kelp material
        const greenVariation = 0.7 + Math.random() * 0.5;
        const kelpMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(0.15 * greenVariation, 0.6 * greenVariation, 0.25 * greenVariation),
            transparent: true,
            opacity: 0.95,
            shininess: 15
        });

        const kelpMesh = new THREE.Mesh(geometry, kelpMaterial);

        // Position kelp in tighter formation
        kelpMesh.position.x = (Math.random() - 0.5) * 15; // Reduced from 40 to 15
        kelpMesh.position.z = (Math.random() - 0.5) * 15; // Reduced from 40 to 15
        kelpMesh.position.y = kelpHeight / 2;

        // Store animation data
        kelpMesh.userData = {
            originalX: kelpMesh.position.x,
            originalZ: kelpMesh.position.z,
            originalY: kelpMesh.position.y,
            height: kelpHeight,
            segments: segments,
            offset1: Math.random() * Math.PI * 2,
            offset2: Math.random() * Math.PI * 2,
            offset3: Math.random() * Math.PI * 2,
            freq1: 0.8 + Math.random() * 0.6,
            freq2: 1.1 + Math.random() * 0.8,
            freq3: 0.5 + Math.random() * 0.4,
            amplitude1: 0.8 + Math.random() * 0.6,
            amplitude2: 0.6 + Math.random() * 0.5,
            amplitude3: 0.4 + Math.random() * 0.3,
            isGLTF: false,
            modelType: 'Fallback Cylinder'
        };

        scene.add(kelpMesh);
        kelp.push(kelpMesh);
    }

    log(`Created ${kelp.length} cylinder kelp plants`);
    startAnimation();
}

function setupControls() {
    
document.addEventListener('mousemove', function(event) {
    if (isMouseDown) {
        targetRotationY += event.movementX * 0.01;
        targetRotationX += event.movementY * 0.01;
        
        // Convert 15 degrees to radians: 15° × (π/180) = 0.2618 radians
        const maxRotation = 15 * (Math.PI / 180); // 15 degrees in radians
        
        // Limit horizontal rotation (left/right) to ±15 degrees
        targetRotationY = Math.max(-maxRotation, Math.min(maxRotation, targetRotationY));
        
        // Limit vertical rotation (up/down) to ±15 degrees  
        targetRotationX = Math.max(-maxRotation, Math.min(maxRotation, targetRotationX));
    }
});

    log('Manual camera controls initialized successfully');

    // Slider controls
    const waveSpeedSlider = document.getElementById('waveSpeed');
    const waveIntensitySlider = document.getElementById('waveIntensity');
    const currentDirectionSlider = document.getElementById('currentDirection');

    if (waveSpeedSlider) {
        waveSpeedSlider.addEventListener('input', function(e) {
            waveSpeed = parseFloat(e.target.value);
        });
    }

    if (waveIntensitySlider) {
        waveIntensitySlider.addEventListener('input', function(e) {
            waveIntensity = parseFloat(e.target.value);
        });
    }

    if (currentDirectionSlider) {
        currentDirectionSlider.addEventListener('input', function(e) {
            currentDirection = parseFloat(e.target.value);
        
        // ALSO UPDATE PARTICLE DIRECTION
            if (typeof OceanParticles !== 'undefined') {
                const radians = (currentDirection * Math.PI) / 180;
                const x = Math.cos(radians);
                const z = Math.sin(radians);
                OceanParticles.setDirection(x, 0.1, z);
        }
    });
}

    // Fallback button (if it exists)
    const fallbackButton = document.getElementById('useFallback');
    if (fallbackButton) {
        fallbackButton.addEventListener('click', function() {
            log('User requested fallback kelp');
            // Clear existing kelp
            kelp.forEach(k => scene.remove(k));
            kelp = [];
            createFallbackKelp();
        });
    }
}

// Function to deform kelp geometry using vertex manipulation with undulating motion
function deformKelp(kelpMesh, time) {
    if (kelpMesh.userData.isGLTF) {
        // Vertex-level deformation for GLTF models with undulation
        const userData = kelpMesh.userData;
        const dirRad = (currentDirection * Math.PI) / 180;
        
        // Keep base completely fixed
        kelpMesh.position.x = userData.originalX;
        kelpMesh.position.z = userData.originalZ;
        kelpMesh.position.y = userData.originalY;
        
        // Calculate wave values for undulation
        const wave1 = Math.sin(time * userData.freq1 + userData.offset1) * userData.amplitude1;
        const wave2 = Math.cos(time * userData.freq2 + userData.offset2) * userData.amplitude2;
        const wave3 = Math.sin(time * userData.freq3 + userData.offset3) * userData.amplitude3;
        
        // Deform each mesh in the GLTF model
        kelpMesh.traverse((child) => {
            if (child.isMesh && child.geometry && child.geometry.userData.originalPositions) {
                const geometry = child.geometry;
                const positions = geometry.attributes.position;
                const originalPositions = geometry.userData.originalPositions;
                const height = geometry.userData.height;
                const minY = geometry.userData.minY;
                
                // Deform each vertex
                for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    
                    // Get original position
                    const originalX = originalPositions[i3];
                    const originalY = originalPositions[i3 + 1];
                    const originalZ = originalPositions[i3 + 2];
                    
                    // Calculate height factor (0 at bottom, 1 at top)
                    const heightFactor = Math.max(0, (originalY - minY) / height);
                    
                    // Create multiple undulation points along the height
                    const undulationFreq1 = 3.0; // Low frequency wave (big curves)
                    const undulationFreq2 = 6.0; // Medium frequency wave
                    const undulationFreq3 = 9.0; // High frequency wave (small ripples)
                    
                    // Calculate undulating displacement with multiple sine waves
                    const undulationX = (
                        Math.sin(heightFactor * undulationFreq1 + time * userData.freq1 + userData.offset1) * 0.8 +
                        Math.sin(heightFactor * undulationFreq2 + time * userData.freq2 + userData.offset2) * 0.4 +
                        Math.sin(heightFactor * undulationFreq3 + time * userData.freq3 + userData.offset3) * 0.2
                    ) * waveIntensity * heightFactor;
                    
                    const undulationZ = (
                        Math.cos(heightFactor * undulationFreq1 + time * userData.freq1 + userData.offset1 + Math.PI/4) * 0.6 +
                        Math.cos(heightFactor * undulationFreq2 + time * userData.freq2 + userData.offset2 + Math.PI/3) * 0.3 +
                        Math.cos(heightFactor * undulationFreq3 + time * userData.freq3 + userData.offset3 + Math.PI/6) * 0.15
                    ) * waveIntensity * heightFactor;
                    
                    // Apply directional current influence
                    const currentInfluenceX = (wave1 + wave2 * 0.5) * waveIntensity * heightFactor * heightFactor;
                    const currentInfluenceZ = (wave2 + wave3 * 0.5) * waveIntensity * heightFactor * heightFactor;
                    
                    // Combine undulation with current direction
                    const finalBendX = (undulationX + currentInfluenceX) * Math.cos(dirRad) + 
                                       (undulationZ + currentInfluenceZ) * Math.sin(dirRad) * 0.3;
                    const finalBendZ = (undulationZ + currentInfluenceZ) * Math.sin(dirRad) + 
                                       (undulationX + currentInfluenceX) * Math.cos(dirRad) * 0.3;
                    
                    // Set new position - bottom stays fixed, creates snake-like motion
                    positions.setX(i, originalX + finalBendX);
                    positions.setY(i, originalY);
                    positions.setZ(i, originalZ + finalBendZ);
                }
                
                // Mark for update
                positions.needsUpdate = true;
                geometry.computeVertexNormals();
            }
        });

    } else {
        // Vertex deformation for cylinder geometry (fallback) with undulation
        const geometry = kelpMesh.geometry;
        const positions = geometry.attributes.position;
        const originalPositions = geometry.userData.originalPositions;
        const userData = kelpMesh.userData;

        // Keep base fixed
        kelpMesh.position.x = userData.originalX;
        kelpMesh.position.z = userData.originalZ;
        kelpMesh.position.y = userData.originalY;

        // Convert direction to radians
        const dirRad = (currentDirection * Math.PI) / 180;

        // Calculate wave values
        const wave1 = Math.sin(time * userData.freq1 + userData.offset1) * userData.amplitude1;
        const wave2 = Math.cos(time * userData.freq2 + userData.offset2) * userData.amplitude2;
        const wave3 = Math.sin(time * userData.freq3 + userData.offset3) * userData.amplitude3;

        // Deform each vertex
        for (let i = 0; i < positions.count; i++) {
            const i3 = i * 3;

            // Get original position
            const originalX = originalPositions[i3];
            const originalY = originalPositions[i3 + 1];
            const originalZ = originalPositions[i3 + 2];

            // Calculate height factor (0 at bottom, 1 at top)
            const heightFactor = (originalY + userData.height/2) / userData.height;
            
            // Create multiple undulation points along the height
            const undulationFreq1 = 2.5; // Low frequency wave (big curves)
            const undulationFreq2 = 5.0; // Medium frequency wave
            const undulationFreq3 = 8.0; // High frequency wave (small ripples)
            
            // Calculate undulating displacement with multiple sine waves
            const undulationX = (
                Math.sin(heightFactor * undulationFreq1 + time * userData.freq1 + userData.offset1) * 1.0 +
                Math.sin(heightFactor * undulationFreq2 + time * userData.freq2 + userData.offset2) * 0.5 +
                Math.sin(heightFactor * undulationFreq3 + time * userData.freq3 + userData.offset3) * 0.25
            ) * waveIntensity * heightFactor;
            
            const undulationZ = (
                Math.cos(heightFactor * undulationFreq1 + time * userData.freq1 + userData.offset1 + Math.PI/4) * 0.8 +
                Math.cos(heightFactor * undulationFreq2 + time * userData.freq2 + userData.offset2 + Math.PI/3) * 0.4 +
                Math.cos(heightFactor * undulationFreq3 + time * userData.freq3 + userData.offset3 + Math.PI/6) * 0.2
            ) * waveIntensity * heightFactor;

            // Apply directional current influence
            const currentInfluenceX = (wave1 + wave2 * 0.7) * waveIntensity * heightFactor * heightFactor;
            const currentInfluenceZ = (wave2 + wave3 * 0.8) * waveIntensity * heightFactor * heightFactor;

            // Combine undulation with current direction
            const finalBendX = (undulationX + currentInfluenceX) * Math.cos(dirRad) + 
                               (undulationZ + currentInfluenceZ) * Math.sin(dirRad) * 0.3;
            const finalBendZ = (undulationZ + currentInfluenceZ) * Math.sin(dirRad) + 
                               (undulationX + currentInfluenceX) * Math.cos(dirRad) * 0.3;

            // Set new position
            positions.setX(i, originalX + finalBendX);
            positions.setY(i, originalY);
            positions.setZ(i, originalZ + finalBendZ);
        }

        // Mark for update
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
    }
}

function animate() {
    requestAnimationFrame(animate);

    time += 0.01 * waveSpeed;

    kelp.forEach(function(k) {
        deformKelp(k, time);
    });

    // Update oscillating plane (now updates shader uniform)
    if (typeof OscillatingPlane !== 'undefined') {
        OscillatingPlane.update(0.01 * waveSpeed); 
    }

    // Update rocks and fish system
    if (typeof window.RocksAndFishSystem !== 'undefined') {
        window.RocksAndFishSystem.update(0.01 * waveSpeed);
    }

    // Update particles (if applicable)
    if (typeof OceanParticles !== 'undefined') {
        OceanParticles.update(.01 * waveSpeed);
    }

    // Update ocean surface waves (if applicable - this is likely now handled by OscillatingPlane)
    // You might remove this line if OscillatingPlane is your primary surface
    if (typeof OceanSurface !== 'undefined') {
        OceanSurface.update(.01 * waveSpeed);
    }

    // Update audio control system
    if (typeof window.AudioControlSystem !== 'undefined') {
        window.AudioControlSystem.update(0.01 * waveSpeed);
    }

    // Update camera position based on mouse controls - lower Y position
    rotationX += (targetRotationX - rotationX) * 0.1;
    rotationY += (targetRotationY - rotationY) * 0.1;

    camera.position.x = Math.sin(rotationY) * Math.cos(rotationX) * distance;
    camera.position.y = Math.sin(rotationX) * distance + 3;
    camera.position.z = Math.cos(rotationY) * Math.cos(rotationX) * distance;
    camera.lookAt(0, 5, 5);

    renderer.render(scene, camera);
}

function startAnimation() {
    log('Starting animation...');

    // Hide debug info after successful start
    const debugDiv = document.getElementById('debug');
    if (debugDiv) {
        setTimeout(() => {
            debugDiv.style.display = 'none';
        }, 3000);
    }

    animate();
}

// Handle window resize
window.addEventListener('resize', function() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Mouse event handlers
document.addEventListener('mousedown', function(event) {
    isMouseDown = true;
});

document.addEventListener('mouseup', function(event) {
    isMouseDown = false;
});

// Export kelp system for compatibility with other systems
window.KelpSystem = {
    getKelpInstances: () => kelp,
    getKelpCount: () => kelp.length,
    getKelpModels: () => KELP_MODELS,
    getLoadedModels: () => loadedModels,
    updateAnimation: (newWaveSpeed, newWaveIntensity, newDirection) => {
        if (newWaveSpeed !== undefined) waveSpeed = newWaveSpeed;
        if (newWaveIntensity !== undefined) waveIntensity = newWaveIntensity;
        if (newDirection !== undefined) currentDirection = newDirection;
    }
};
