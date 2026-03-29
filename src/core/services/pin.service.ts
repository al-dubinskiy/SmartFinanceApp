import Keychain from 'react-native-keychain';

class PinService {
  private readonly PIN_SERVICE = 'com.smartfinance.pin';
  private readonly PIN_LENGTH = 6;

  async savePin(pin: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (pin.length !== this.PIN_LENGTH) {
        return { success: false, error: `PIN must be ${this.PIN_LENGTH} digits` };
      }

      await Keychain.setGenericPassword(userEmail, pin, {
        service: this.PIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save PIN',
      };
    }
  }

  async validatePin(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.PIN_SERVICE,
      });

      if (!credentials) {
        return { success: false, error: 'PIN not set' };
      }

      const isValid = credentials.password === pin;
      return { success: isValid };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate PIN',
      };
    }
  }

  async hasPin(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.PIN_SERVICE,
      });
      return !!credentials;
    } catch {
      return false;
    }
  }

  async removePin(): Promise<{ success: boolean; error?: string }> {
    try {
      await Keychain.resetGenericPassword({
        service: this.PIN_SERVICE,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove PIN',
      };
    }
  }
}

export default new PinService();