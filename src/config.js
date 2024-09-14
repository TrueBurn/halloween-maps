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

  const { data: { user } } = await _supabaseClient.auth.getUser();
  if (user) {
    showConfigForm();
  } else {
    document.getElementById('loginForm').style.display = 'block';
  }
});

function formatToE164(phoneNumber) {
  let digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length === 9) {
    digits = '27' + digits;
  } else if (digits.length === 10 && digits.startsWith('0')) {
    digits = '27' + digits.slice(1);
  }
  
  return '+' + digits;
}

async function verifyLastFourDigits() {
  clearMessage(); // Clear any existing messages
  const lastFourInput = document.getElementById('lastFourDigits');
  const lastFour = lastFourInput.value;

  if (!/^\d{4}$/.test(lastFour)) {
    showError("Please enter exactly 4 digits.");
    return;
  }

  try {
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
        // If phone OTP fails, fall back to email OTP
        if (data.email) {
          const { error: emailError } = await _supabaseClient.auth.signInWithOtp({
            email: data.email
          });
          if (emailError) throw emailError;
          showSuccess("OTP sent to your email. Please check and enter the code.");
        } else {
          throw new Error("Unable to send OTP via phone or email.");
        }
      } else {
        showSuccess("OTP sent to your phone. Please enter the code.");
      }

      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('otpForm').style.display = 'block';
    } else {
      showError("Invalid last 4 digits. Please try again.");
    }
  } catch (error) {
    showError(error.message);
  }
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
  clearMessage(); // Clear any existing messages
  const hasCandy = document.getElementById('hasCandy').checked;
  
  try {
    const { error } = await _supabaseClient
      .from('location')
      .update({ has_candy: hasCandy })
      .eq('id', locationId);

    if (error) throw error;

    showSuccess("Location updated successfully!");
  } catch (error) {
    showError(error.message);
  }
}

function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.classList.remove('text-green-500');
  errorElement.classList.add('text-red-500');
  errorElement.style.display = 'block';
}

function showSuccess(message) {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.classList.remove('text-red-500');
  errorElement.classList.add('text-green-500');
  errorElement.style.display = 'block';
}

function clearMessage() {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = '';
  errorElement.style.display = 'none';
  errorElement.classList.remove('text-green-500', 'text-red-500');
}