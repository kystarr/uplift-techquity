import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "./SignUpForm";

const renderSignUpForm = (onSubmit = vi.fn()) => {
  return render(<SignUpForm onSubmit={onSubmit} />);
};

describe("SignUpForm", () => {
  describe("Invalid input blocked", () => {
    it("does not call onSubmit when form is submitted empty", async () => {
      const onSubmit = vi.fn();
      renderSignUpForm(onSubmit);

      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not call onSubmit when name is too short", async () => {
      const onSubmit = vi.fn();
      renderSignUpForm(onSubmit);

      await userEvent.type(screen.getByLabelText(/full name/i), "A");
      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
      await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not call onSubmit when password is too short", async () => {
      const onSubmit = vi.fn();
      renderSignUpForm(onSubmit);

      await userEvent.type(screen.getByLabelText(/full name/i), "Jane Doe");
      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "short");
      await userEvent.type(screen.getByLabelText(/confirm password/i), "short");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not call onSubmit when passwords do not match", async () => {
      const onSubmit = vi.fn();
      renderSignUpForm(onSubmit);

      await userEvent.type(screen.getByLabelText(/full name/i), "Jane Doe");
      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
      await userEvent.type(screen.getByLabelText(/confirm password/i), "different456");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Error messaging works", () => {
    it("shows required errors when submitted empty", async () => {
      renderSignUpForm();

      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
      expect(screen.getByText("Please confirm your password")).toBeInTheDocument();
    });

    it("shows error when name is too short", async () => {
      renderSignUpForm();

      await userEvent.type(screen.getByLabelText(/full name/i), "A");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText("Name must be at least 2 characters")).toBeInTheDocument();
    });

    it("shows error for invalid email", async () => {
      renderSignUpForm();

      await userEvent.type(screen.getByLabelText(/email/i), "invalid");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
    });

    it("shows error when password is less than 8 characters", async () => {
      renderSignUpForm();

      await userEvent.type(screen.getByLabelText(/^password$/i), "short");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });

    it("shows error when passwords do not match", async () => {
      renderSignUpForm();

      await userEvent.type(screen.getByLabelText(/full name/i), "Jane Doe");
      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
      await userEvent.type(screen.getByLabelText(/confirm password/i), "different456");
      await userEvent.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  it("calls onSubmit with values when input is valid", async () => {
    const onSubmit = vi.fn();
    renderSignUpForm(onSubmit);

    await userEvent.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "securepass123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "securepass123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "securepass123",
        confirmPassword: "securepass123",
      },
      expect.anything()
    );
  });
});
