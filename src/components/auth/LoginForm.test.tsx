import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "./LoginForm";

const renderLoginForm = (onSubmit = vi.fn()) => {
  return render(
    <MemoryRouter>
      <LoginForm onSubmit={onSubmit} />
    </MemoryRouter>
  );
};

describe("LoginForm", () => {
  describe("Invalid input blocked", () => {
    it("does not call onSubmit when form is submitted empty", async () => {
      const onSubmit = vi.fn();
      renderLoginForm(onSubmit);

      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not call onSubmit when email is invalid", async () => {
      const onSubmit = vi.fn();
      renderLoginForm(onSubmit);

      await userEvent.type(screen.getByLabelText(/email/i), "notanemail");
      await userEvent.type(screen.getByLabelText(/password/i), "anypassword");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not call onSubmit when password is empty", async () => {
      const onSubmit = vi.fn();
      renderLoginForm(onSubmit);

      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Error messaging works", () => {
    it("shows required error for email when submitted empty", async () => {
      renderLoginForm();

      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    it("shows required error for password when submitted empty", async () => {
      renderLoginForm();

      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });

    it("shows invalid email message when email format is wrong", async () => {
      renderLoginForm();

      await userEvent.type(screen.getByLabelText(/email/i), "bad-email");
      await userEvent.type(screen.getByLabelText(/password/i), "somepassword");
      await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
    });
  });

  it("calls onSubmit with values when input is valid", async () => {
    const onSubmit = vi.fn();
    renderLoginForm(onSubmit);

    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      { email: "user@example.com", password: "secret123" },
      expect.anything()
    );
  });
});
