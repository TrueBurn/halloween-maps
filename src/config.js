const { createClient } = supabase;

const _supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anon_token,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

let locationId;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  locationId = urlParams.get('locationId');

  if (!locationId) {
    showError("No location ID provided.");
    return;
  }

  // Set initial theme
  const savedTheme = getCookie('theme') || localStorage.theme;
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  await loadLocationDetails();

  const { data: { user } } = await _supabaseClient.auth.getUser();
  if (user) {
    showConfigForm();
  } else {
    document.getElementById('loginForm').style.display = 'block';
  }
});

async function loadLocationDetails() {
  try {
    const { data, error } = await _supabaseClient
      .from('location')
      .select('address, location_type, route')
      .eq('id', locationId)
      .single();

    if (error) throw error;

    const detailsElement = document.getElementById('locationDetails');
    detailsElement.innerHTML = `
      <p><strong>Address:</strong> ${data.address}</p>
      <p><strong>Type:</strong> ${data.location_type}</p>
      ${data.route ? `<p><strong>Route:</strong> ${data.route}</p>` : ''}
    `;
  } catch (error) {
    showError(`Error loading location details: ${error.message}`);
  }
}

function formatToE164(phoneNumber) {
  let digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length === 9) {
    digits = '27' + digits;
  } else if (digits.length === 10 && digits.startsWith('0')) {
    digits = '27' + digits.slice(1);
  }
  
  return '+' + digits;
}

const OTP_COOLDOWN = 60000; // 1 minute in milliseconds
let lastOTPRequestTime = 0;

async function verifyLastFourDigits() {
  clearMessage();
  const lastFourInput = document.getElementById('lastFourDigits');
  const verifyButton = document.getElementById('verifyButton');
  const lastFour = lastFourInput.value;

  if (!/^\d{4}$/.test(lastFour)) {
    showError("Please enter exactly 4 digits.");
    return;
  }

  try {
    verifyButton.disabled = true;
    verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

    const now = Date.now();
    if (now - lastOTPRequestTime < OTP_COOLDOWN) {
      const remainingTime = Math.ceil((OTP_COOLDOWN - (now - lastOTPRequestTime)) / 1000);
      showError(`Please wait ${remainingTime} seconds before requesting another OTP.`);
      return;
    }

    const { data, error } = await _supabaseClient
      .from('location')
      .select('phone_number, email')
      .eq('id', locationId)
      .single();

    if (error) throw error;

    if (data.phone_number.endsWith(lastFour)) {
      // Try phone OTP first
      const formattedPhoneNumber = formatToE164(data.phone_number);
      const { error: phoneError } = await _supabaseClient.auth.signInWithOtp({
        phone: formattedPhoneNumber
      });

      if (phoneError) {
        // If phone OTP fails, fall back to email magic link
        if (data.email) {
          const { error: emailError } = await _supabaseClient.auth.signInWithOtp({
            email: data.email
          });
          if (emailError) {
            if (emailError.message.includes('rate limit')) {
              throw new Error("Too many login attempts. Please try again later.");
            }
            throw emailError;
          }
          showSuccess("A magic link has been sent to your email. Please check your inbox and click the link to log in.");
          document.getElementById('loginForm').style.display = 'none';
          document.getElementById('waitingForMagicLink').style.display = 'block';
          startMagicLinkCheck();
        } else {
          throw new Error("Unable to send OTP via phone or email.");
        }
      } else {
        showSuccess("OTP sent to your phone. Please enter the code.");
        lastOTPRequestTime = now;
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('otpForm').style.display = 'block';
      }
    } else {
      showError("Invalid last 4 digits. Please try again.");
    }
  } catch (error) {
    showError(error.message);
  } finally {
    verifyButton.disabled = false;
    verifyButton.innerHTML = 'Verify';
  }
}

function startMagicLinkCheck() {
  const waitingElement = document.getElementById('waitingForMagicLink');
  const checkInterval = setInterval(async () => {
    const { data: { user } } = await _supabaseClient.auth.getUser();
    if (user) {
      clearInterval(checkInterval);
      showConfigForm();
    }
  }, 2000); // Check every 2 seconds

  // Stop checking after 5 minutes (300000 ms)
  setTimeout(() => {
    clearInterval(checkInterval);
    waitingElement.innerHTML = `
      <h2 class="text-xl font-semibold text-witch-black dark:text-ghost-white">Magic Link Expired</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        The magic link has expired. Please try again.
      </p>
      <button onclick="resetLoginForm()" class="mt-4 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
        Try Again
      </button>
    `;
  }, 300000);
}

function resetLoginForm() {
  document.getElementById('waitingForMagicLink').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('lastFourDigits').value = '';
}

async function verifyOTP() {
  clearMessage(); // Clear any existing messages
  const otpInput = document.getElementById('otp');
  const otp = otpInput.value;

  if (!/^\d{6}$/.test(otp)) {
    showError("Please enter a 6-digit OTP.");
    return;
  }

  try {
    const { error } = await _supabaseClient.auth.verifyOtp({
      token: otp,
      type: 'sms'
    });
    if (error) {
      // If SMS verification fails, try email verification
      const { error: emailError } = await _supabaseClient.auth.verifyOtp({
        token: otp,
        type: 'magiclink'
      });
      if (emailError) throw emailError;
    }

    showConfigForm();
  } catch (error) {
    showError(error.message);
  }
}

async function showConfigForm() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('otpForm').style.display = 'none';
  document.getElementById('configForm').style.display = 'block';

  try {
    const { data, error } = await _supabaseClient
      .from('location')
      .select('has_candy')
      .eq('id', locationId)
      .single();

    if (error) throw error;

    document.getElementById('hasCandy').checked = data.has_candy;
  } catch (error) {
    showError(error.message);
  }
}

async function updateHasCandy() {
  clearMessage();
  const hasCandy = document.getElementById('hasCandy').checked;
  const updateButton = document.getElementById('updateButton');
  
  try {
    updateButton.disabled = true;
    updateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    const { data: { user } } = await _supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User is not authenticated");
    }

    // Fetch the location data to get the phone number or email
    const { data: locationData, error: locationError } = await _supabaseClient
      .from('location')
      .select('phone_number, email')
      .eq('id', locationId)
      .single();

    if (locationError) throw locationError;

    // Determine which identifier to use (phone or email)
    const identifier = user.phone || user.email;
    const locationIdentifier = locationData.phone_number || locationData.email;

    if (identifier !== locationIdentifier) {
      throw new Error("User does not have permission to update this location");
    }

    const { data, error } = await _supabaseClient
      .from('location')
      .update({ has_candy: hasCandy })
      .eq('id', locationId)
      .eq(user.phone ? 'phone_number' : 'email', identifier);

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    showSuccess("Location updated successfully!");
  } catch (error) {
    showError(`Error updating location: ${error.message}`);
  } finally {
    updateButton.disabled = false;
    updateButton.innerHTML = 'Update';
  }
}

async function logout() {
  const logoutButton = document.getElementById('logoutButton');
  
  try {
    logoutButton.disabled = true;
    logoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';

    const { error } = await _supabaseClient.auth.signOut();
    if (error) throw error;

    showSuccess("Logged out successfully!");
    setTimeout(() => {
      document.getElementById('configForm').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
    }, 2000);
  } catch (error) {
    showError(`Error logging out: ${error.message}`);
  } finally {
    logoutButton.disabled = false;
    logoutButton.innerHTML = 'Logout';
  }
}

function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.classList.remove('text-green-500', 'bg-green-100');
  errorElement.classList.add('text-red-500', 'bg-red-100', 'p-2', 'rounded');
  errorElement.style.display = 'block';
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.classList.remove('text-red-500', 'bg-red-100');
  errorElement.classList.add('text-green-500', 'bg-green-100', 'p-2', 'rounded');
  errorElement.style.display = 'block';
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

function clearMessage() {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = '';
  errorElement.style.display = 'none';
  errorElement.classList.remove('text-green-500', 'bg-green-100', 'text-red-500', 'bg-red-100');
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.theme = isDark ? 'dark' : 'light';
  setCookie('theme', isDark ? 'dark' : 'light', 365); // Store preference for 1 year
}

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

// Add this function at the end of the file
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    const { data: { user } } = _supabaseClient.auth.getUser();
    if (user) {
      showConfigForm();
    }
  }
});