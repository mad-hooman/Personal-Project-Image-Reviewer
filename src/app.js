const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Configuration
const IMAGE_COUNT = 5;
const FIFTH_IMAGE_NAME = '5-NoImage.png';

let folders = [];
let currentFolderIndex = 0;
let folderImageIndices = {};
let selectedImages = {};
let rootDirectoryPath = '';
let batchName = '';

document.getElementById('start-review').addEventListener('click', async () => {
  try {
    batchName = await ipcRenderer.invoke('show-prompt', {
      title: 'Batch Name',
      message: 'Enter batch name:',
      input: 'Batch1'
    });

    if (!batchName) {
      alert('Batch name is required!');
      return;
    }

    rootDirectoryPath = await ipcRenderer.invoke('select-directory');
    if (!rootDirectoryPath) return;

    if (path.basename(rootDirectoryPath) === 'Completed Batches') {
      alert('Please select parent directory, not Completed Batches!');
      return;
    }

    folders = fs.readdirSync(rootDirectoryPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name !== 'Completed Batches')
      .map(dirent => dirent.name)
      .sort();

    if (folders.length === 0) {
      alert('No valid folders found!');
      return;
    }

    document.getElementById('intro-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('current-batch').textContent = batchName;
    currentFolderIndex = 0;
    initializeFolder();
    updateUI();

  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

function initializeFolder() {
  const folderName = folders[currentFolderIndex];
  folderImageIndices[folderName] = folderImageIndices[folderName] || 1;
  selectedImages[folderName] = folderImageIndices[folderName];
  loadImage();
}

function getImageFileName(imageIndex, folderName) {
  if (imageIndex === 5) {
    const specialPath = path.join(rootDirectoryPath, folderName, FIFTH_IMAGE_NAME);
    return fs.existsSync(specialPath) ? FIFTH_IMAGE_NAME : '5.png';
  }
  return `${imageIndex}.png`;
}

function loadImage() {
  const folderName = folders[currentFolderIndex];
  const imageIndex = folderImageIndices[folderName];
  const fileName = getImageFileName(imageIndex, folderName);
  const imagePath = path.join(rootDirectoryPath, folderName, fileName);

  try {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    document.getElementById('image').src = `data:image/png;base64,${base64Image}`;
    updateUI();
  } catch (error) {
    document.getElementById('image').src = '';
  }
}

function updateUI() {
  const folderName = folders[currentFolderIndex];
  const imageIndex = folderImageIndices[folderName];
  
  document.getElementById('counter').textContent = `| Image ${imageIndex}/${IMAGE_COUNT}`;
  document.getElementById('folder-name').textContent = `Folder: ${folderName}`;
  document.getElementById('position').textContent = `| Position: ${currentFolderIndex + 1}/${folders.length}`;
  document.getElementById('save-batch').style.display = 
    (currentFolderIndex === folders.length - 1) ? 'block' : 'none';
}

document.addEventListener('keydown', (event) => {
  if (!rootDirectoryPath) return;

  const folderName = folders[currentFolderIndex];
  
  switch(event.key) {
    case 'ArrowLeft':
      if (currentFolderIndex > 0) {
        currentFolderIndex--;
        initializeFolder();
      }
      break;
      
    case 'ArrowRight':
      if (currentFolderIndex < folders.length - 1) {
        currentFolderIndex++;
        initializeFolder();
      }
      break;
      
    case 'ArrowUp':
      if (folderImageIndices[folderName] > 1) {
        folderImageIndices[folderName]--;
        selectedImages[folderName] = folderImageIndices[folderName];
        loadImage();
      }
      break;
      
    case 'ArrowDown':
      if (folderImageIndices[folderName] < IMAGE_COUNT) {
        folderImageIndices[folderName]++;
        selectedImages[folderName] = folderImageIndices[folderName];
        loadImage();
      }
      break;
  }
});

document.getElementById('save-batch').addEventListener('click', async () => {
  try {
    const completedBatchesPath = path.join(rootDirectoryPath, 'Completed Batches');
    const batchPath = path.join(completedBatchesPath, batchName);

    if (!fs.existsSync(completedBatchesPath)) fs.mkdirSync(completedBatchesPath);
    if (!fs.existsSync(batchPath)) fs.mkdirSync(batchPath);

    const logContent = [];
    for (const [folderName, imageIndex] of Object.entries(selectedImages)) {
      const fileName = getImageFileName(imageIndex, folderName);
      const sourcePath = path.join(rootDirectoryPath, folderName, fileName);
      const destPath = path.join(batchPath, `${folderName}.png`);
      
      fs.copyFileSync(sourcePath, destPath);
      logContent.push(`${folderName}: ${fileName}`);
    }

    fs.writeFileSync(path.join(batchPath, 'selections.log'), logContent.join('\n'));
    
    resetApplication();
    alert(`Batch saved to:\n${batchPath}`);
  } catch (error) {
    alert(`Save failed: ${error.message}`);
  }
});

function resetApplication() {
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('intro-page').style.display = 'flex';
  folders = [];
  currentFolderIndex = 0;
  folderImageIndices = {};
  selectedImages = {};
  rootDirectoryPath = '';
  batchName = '';
  document.getElementById('image').src = '';
  document.getElementById('folder-name').textContent = 'Folder: ';
  document.getElementById('counter').textContent = `| Image 1/${IMAGE_COUNT}`;
  document.getElementById('position').textContent = '| Position: 0/0';
  document.getElementById('current-batch').textContent = '';
}