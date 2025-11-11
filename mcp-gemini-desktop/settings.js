// settings.js - QuestKeeperAI Settings Dialog
document.addEventListener("DOMContentLoaded", async () => {
  // Get DOM elements
  const providerRadios = document.querySelectorAll('input[name="provider"]');
  const anthropicSection = document.getElementById('anthropic-section');
  const openaiSection = document.getElementById('openai-section');
  const geminiSection = document.getElementById('gemini-section');
  const localSection = document.getElementById('local-section');

  const anthropicKeyInput = document.getElementById('anthropic-key');
  const openaiKeyInput = document.getElementById('openai-key');
  const geminiKeyInput = document.getElementById('gemini-key');
  const localUrlInput = document.getElementById('local-url');
  const localModelInput = document.getElementById('local-model');

  const debugModeSelect = document.getElementById('debug-mode');
  const statusMessage = document.getElementById('status-message');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  // Load current settings from backend
  await loadCurrentSettings();

  // Provider switching logic
  providerRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const provider = radio.value;
      showProviderSection(provider);
    });
  });

  // Show appropriate section based on provider
  function showProviderSection(provider) {
    // Hide all sections first
    anthropicSection.classList.remove('active');
    openaiSection.classList.remove('active');
    geminiSection.classList.remove('active');
    localSection.classList.remove('active');

    // Show selected section
    switch(provider) {
      case 'anthropic':
        anthropicSection.classList.add('active');
        anthropicKeyInput.focus();
        break;
      case 'openai':
        openaiSection.classList.add('active');
        openaiKeyInput.focus();
        break;
      case 'gemini':
        geminiSection.classList.add('active');
        geminiKeyInput.focus();
        break;
      case 'local':
        localSection.classList.add('active');
        localUrlInput.focus();
        break;
    }
  }

  // Load current settings
  async function loadCurrentSettings() {
    try {
      // This would call a backend endpoint to get current settings
      // For now, we'll default to Gemini
      const currentProvider = 'gemini'; // TODO: Get from backend

      // Set radio button
      const providerRadio = document.querySelector(`input[value="${currentProvider}"]`);
      if (providerRadio) {
        providerRadio.checked = true;
        showProviderSection(currentProvider);
      }

      // TODO: Load saved API keys (if stored)
      // Note: For security, we might not want to retrieve keys from backend

    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Error loading settings', 'error');
    }
  }

  // Save settings
  saveBtn.addEventListener("click", async () => {
    // Disable buttons during save
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      // Get selected provider
      const selectedProvider = document.querySelector('input[name="provider"]:checked').value;

      // Collect settings based on provider
      const settings = {
        provider: selectedProvider
      };

      // Add API key or config based on provider
      switch(selectedProvider) {
        case 'anthropic':
          settings.api_key = anthropicKeyInput.value.trim();
          if (!settings.api_key) {
            throw new Error('Please enter your Anthropic API key');
          }
          break;

        case 'openai':
          settings.api_key = openaiKeyInput.value.trim();
          if (!settings.api_key) {
            throw new Error('Please enter your OpenAI API key');
          }
          break;

        case 'gemini':
          settings.api_key = geminiKeyInput.value.trim();
          if (!settings.api_key) {
            throw new Error('Please enter your Gemini API key');
          }
          break;

        case 'local':
          settings.local_url = localUrlInput.value.trim();
          settings.local_model = localModelInput.value.trim();
          if (!settings.local_url) {
            throw new Error('Please enter your local LLM URL');
          }
          if (!settings.local_model) {
            throw new Error('Please enter the model name');
          }
          break;
      }

      // Add debug mode
      settings.debug = debugModeSelect.value === 'true';

      // Send settings to backend via IPC
      await saveSettings(settings);

      // Show success message
      showMessage('Settings saved successfully! Restart may be required.', 'success');

      // Close dialog after a short delay
      setTimeout(() => {
        window.settingsAPI.closeDialog();
      }, 1500);

    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage(error.message || 'Error saving settings', 'error');

      // Re-enable buttons
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.textContent = "Save Settings";
    }
  });

  // Cancel button
  cancelBtn.addEventListener("click", () => {
    window.settingsAPI.closeDialog();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      saveBtn.click();
    } else if (event.key === 'Escape') {
      cancelBtn.click();
    }
  });

  // Save settings to backend
  async function saveSettings(settings) {
    // This would send settings to the Flask backend via IPC
    // The backend would update environment variables or config file

    // For now, we'll use the existing saveKey method
    // TODO: Update IPC to handle full settings object
    if (settings.api_key) {
      window.settingsAPI.saveKey(settings.api_key);
    }

    console.log('Settings to save:', settings);

    // In a full implementation, we'd have:
    // await window.settingsAPI.saveSettings(settings);
  }

  // Show status message
  function showMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
  }
});
