import { SecretManager } from "../../../src/services/secret_manager";

const projectNumber = '-';
const secretName = '-';

describe('SecretManager.', () => {
  test('retrieveSecret() creates a secret if none found.', async () => {

    const secretManager = SecretManager.getInstance();

    try {
      await secretManager.deleteSecret(secretName);
    } catch(error) {
      console.log(error);
    }

    const secret = await secretManager.retrieveOrCreateSecret(secretName);

    expect(secret.name).toBe('projects/' + projectNumber + '/secrets/' + secretName);
    
  });

  test('listSecrets() lists all secrets for the project.', async () => {

    const secretManager = SecretManager.getInstance();
    
    const secrets = await secretManager.listSecrets();

    console.log(secrets);
        
  });

  test('deleteSecret() deletes the secret if it exists.', async () => {

    const secretManager = SecretManager.getInstance();

    await secretManager.deleteSecret(secretName);
    
  });

  test('deleteSecret() throws if secret does not exist.', async () => {

    const secretManager = SecretManager.getInstance();

    let savedError: Error | null = null;

    try {
      await secretManager.deleteSecret(secretName);
    } catch(error) {
      savedError = error;
    }

    expect(savedError).not.toBeNull();
    
  });

  test('saveAsanaCredentials ...', async () => {

    // (clientMock.getSecret as jest.Mock).mockReturnValueOnce(Promise.resolve([secretMock]));

    // const clientMock = mock<SecretManagerServiceClient>();

    // clientMock.listSecretVersions.mockReturnValueOnce()

    // const secretManager = SecretManager.getInstance(clientMock);

    return true;
    
  });
});
