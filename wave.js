console.log('🌊 Ocean Surface Wave System Loading...');

// Surface wave configuration
const SURFACE_CONFIG = {
  width: 1000,
  height: 1000,
  segments: 128,
  surfaceHeight: 70,        // Height above ground plane
  waveAmplitude: 0.8,       // Maximum wave height
  waveSpeed: 1.2,           // Speed of wave animation
  color: 0x006994,          // Deep ocean blue
  opacity: 0.7,             // Semi-transparent
  reflectivity: 0.6,        // Material reflectiveness (Note: MeshPhongMaterial uses shininess/specular, not direct reflectivity)
  wireframe: false          // Set to true for debugging
};

let oceanSurface = null;
let surfaceGeometry = null;
let surfaceMaterial = null;
let waveTime = 0;

// Initialize the ocean surface - now accepts a scene object
function initializeOceanSurface(scene) {
  if (!scene) { // Check if scene is passed
    console.error('❌ Scene object must be provided to initializeOceanSurface.');
    return;
  }

  console.log('🌊 Creating ocean surface...');

  // Create plane geometry with many segments for smooth waves
  surfaceGeometry = new THREE.PlaneGeometry(
    SURFACE_CONFIG.width,
    SURFACE_CONFIG.height,
    SURFACE_CONFIG.segments,
    SURFACE_CONFIG.segments
  );

  // Create material with water-like properties
  surfaceMaterial = new THREE.MeshPhongMaterial({
    color: SURFACE_CONFIG.color,
    transparent: true,
    opacity: SURFACE_CONFIG.opacity,
    shininess: 100,
    specular: 0x222222,
    wireframe: SURFACE_CONFIG.wireframe,
    side: THREE.DoubleSide  // Make visible from both sides
  });

  // Create the mesh
  oceanSurface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

  // Position the surface above the ground
  oceanSurface.position.y = SURFACE_CONFIG.surfaceHeight;
  // IMPORTANT: For viewing from UNDER the water, if the plane is created in XY
  // and you want the "top" (Z positive in local space) to be visible from below,
  // you rotate it by Math.PI / 2.
  // If you are looking UP at the ocean surface, this rotation makes sense.
  // If your camera is also below and looking up, this plane will be above you.
  // If you meant the "underside" of the default plane to be the visible side, then rotation.x = Math.PI / 2 is correct.
  // Let's stick with what you described: "inverted the top plane so we could see the animation from under the water."
  // This usually means the normal faces downwards, so if default is Z-up, you might flip it or simply use DoubleSide.
  // Given your original setup, Math.PI / 2 was used. We'll use that as it was likely correct for your initial intent.
  oceanSurface.rotation.x = Math.PI / 2; // Rotate to face downward (view from below if camera is above)

  // Store original vertex positions for wave calculations
  const positions = surfaceGeometry.attributes.position;
  oceanSurface.userData.originalPositions = [];

  for (let i = 0; i < positions.count; i++) {
    oceanSurface.userData.originalPositions.push({
      x: positions.getX(i),
      y: positions.getY(i),
      z: positions.getZ(i)
    });
  }

  scene.add(oceanSurface);
  console.log('✅ Ocean surface created with', positions.count, 'vertices');
}

// Update wave animation
function updateOceanSurface(deltaTime) {
  if (!oceanSurface || !surfaceGeometry) return;

  waveTime += deltaTime * SURFACE_CONFIG.waveSpeed;

  const positions = surfaceGeometry.attributes.position;
  const originalPositions = oceanSurface.userData.originalPositions;

  // Apply multiple wave functions for realistic water movement
  for (let i = 0; i < positions.count; i++) {
    const original = originalPositions[i];
    const x = original.x;
    const y = original.y;

    // Multiple overlapping wave patterns
    const wave1 = Math.sin(x * 0.02 + waveTime) * SURFACE_CONFIG.waveAmplitude * 0.5;
    const wave2 = Math.cos(y * 0.025 + waveTime * 1.3) * SURFACE_CONFIG.waveAmplitude * 0.3;
    const wave3 = Math.sin((x + y) * 0.015 + waveTime * 0.8) * SURFACE_CONFIG.waveAmplitude * 0.4;
    const wave4 = Math.cos((x - y) * 0.018 + waveTime * 1.7) * SURFACE_CONFIG.waveAmplitude * 0.2;

    // Combine waves for complex surface movement
    const finalHeight = wave1 + wave2 + wave3 + wave4;

    // Update vertex position (z becomes height since plane is rotated)
    positions.setZ(i, finalHeight);
  }

  // Mark geometry for update
  positions.needsUpdate = true;

  // Recalculate normals for proper lighting
  surfaceGeometry.computeVertexNormals();
}

// Add ripple effect at specific position
function createRipple(x, z, intensity = 1.0) {
  if (!oceanSurface || !surfaceGeometry) return;

  const positions = surfaceGeometry.attributes.position;
  const originalPositions = oceanSurface.userData.originalPositions; // Use original positions for ripple base
  const rippleRadius = 50; // Increased radius for more noticeable ripple
  const rippleStrength = intensity * 3.0; // Increased strength

  for (let i = 0; i < positions.count; i++) {
    const original = originalPositions[i];
    // Use original.x and original.y as the base coordinates for distance calculation
    const vertexX = original.x;
    const vertexY = original.y;

    const distance = Math.sqrt((vertexX - x) ** 2 + (vertexY - z) ** 2);

    if (distance < rippleRadius) {
      // Create a decaying wave effect for ripple
      const rippleEffect = Math.sin(distance * 0.5 - waveTime * 5) * rippleStrength *
                           (1 - distance / rippleRadius) * // Decay based on distance from center
                           Math.max(0, Math.cos(distance * 0.1)); // Add some falloff

      const currentBaseZ = positions.getZ(i); // Get the current wave height
      positions.setZ(i, currentBaseZ + rippleEffect);
    }
  }

  positions.needsUpdate = true;
  surfaceGeometry.computeVertexNormals();
}


// Adjust surface properties
function setSurfaceProperties(options = {}) {
  if (!surfaceMaterial) return;

  if (options.color !== undefined) {
    surfaceMaterial.color.setHex(options.color);
    SURFACE_CONFIG.color = options.color;
  }

  if (options.opacity !== undefined) {
    surfaceMaterial.opacity = options.opacity;
    SURFACE_CONFIG.opacity = options.opacity;
  }

  if (options.waveAmplitude !== undefined) {
    SURFACE_CONFIG.waveAmplitude = options.waveAmplitude;
  }

  if (options.waveSpeed !== undefined) {
    SURFACE_CONFIG.waveSpeed = options.waveSpeed;
  }

  if (options.wireframe !== undefined) {
    surfaceMaterial.wireframe = options.wireframe;
    SURFACE_CONFIG.wireframe = options.wireframe;
  }

  console.log('🌊 Surface properties updated');
}

// Toggle surface visibility
function toggleSurface(visible) {
  if (oceanSurface) {
    oceanSurface.visible = visible;
    console.log(`🌊 Ocean surface ${visible ? 'enabled' : 'disabled'}`);
  }
}

// Cleanup function
function cleanupSurface() {
  if (oceanSurface) {
    scene.remove(oceanSurface);
    if (surfaceGeometry) surfaceGeometry.dispose();
    if (surfaceMaterial) surfaceMaterial.dispose();
    oceanSurface = null;
    surfaceGeometry = null;
    surfaceMaterial = null;
    console.log('🧹 Ocean surface cleaned up');
  }
}

// Weather effects
function applyWeatherEffect(weatherType) {
  switch(weatherType) {
    case 'calm':
      setSurfaceProperties({
        waveAmplitude: 0.3,
        waveSpeed: 0.5,
        color: 0x006994
      });
      break;
    case 'choppy':
      setSurfaceProperties({
        waveAmplitude: 1.2,
        waveSpeed: 2.0,
        color: 0x004466
      });
      break;
    case 'stormy':
      setSurfaceProperties({
        waveAmplitude: 2.5,
        waveSpeed: 3.5,
        color: 0x002233
      });
      break;
    default: // Reset to default
      setSurfaceProperties({
        waveAmplitude: 0.8,
        waveSpeed: 1.2,
        color: 0x006994
      });
  }
  console.log(`🌊 Weather set to: ${weatherType}`);
}

// Global interface - exposed for external access
window.OceanSurface = {
  initialize: initializeOceanSurface, // Now accepts a scene object
  update: updateOceanSurface,
  createRipple: createRipple,
  setProperties: setSurfaceProperties,
  toggle: toggleSurface,
  cleanup: cleanupSurface,
  weather: applyWeatherEffect,
  config: SURFACE_CONFIG
};

console.log('🌊 Ocean Surface System Ready!');
console.log('💡 Usage examples:');
console.log('   // 1. In your main Three.js setup, after scene is created:');
console.log('   //    OceanSurface.initialize(mySceneVariable);');
console.log('   // 2. In your animation loop:');
console.log('   //    const deltaTime = clock.getDelta(); // Assuming you have a THREE.Clock');
console.log('   //    OceanSurface.update(deltaTime);');
console.log('   OceanSurface.createRipple(10, 10, 2.0) - Create ripple effect');
console.log('   OceanSurface.weather("stormy") - Change weather conditions');
console.log('   OceanSurface.setProperties({wireframe: true}) - Toggle wireframe view');
