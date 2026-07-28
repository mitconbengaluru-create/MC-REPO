describe('Authentication Flow', () => {
  it('should load login page and allow login with valid credentials', () => {
    cy.visit('/');
    const email = Cypress.env('TEST_ADMIN_EMAIL') || 'admin@mitconindia.com';
    const password = Cypress.env('TEST_ADMIN_PASSWORD') || 'password123';
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('button[type="submit"]').click();
    
    // Check that we logged in successfully by confirming layout elements
    cy.contains('Terminate Session', { timeout: 15000 });
  });
});
