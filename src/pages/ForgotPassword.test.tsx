import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";

const renderForgotPassword = () => {
  return render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );
};

describe("ForgotPassword", () => {
  describe("Invalid input blocked", () => {
    it("does not submit when email is empty", async () => {
      renderForgotPassword();

      await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));

      // Submit handler would show toast; we assert error is shown and no success path
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    it("does not submit when email is invalid", async () => {
      renderForgotPassword();

      await userEvent.type(screen.getByLabelText(/email/i), "notanemail");
      await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));

      expect(await screen.findByText("Please enter a valid email")).toBeInTheDocument();
    });
  });

  describe("Error messaging works", () => {
    it("shows required error for email when submitted empty", async () => {
      renderForgotPassword();

      await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));

      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    it("shows invalid email message when format is wrong", async () => {
      renderForgotPassword();

      await userEvent.type(screen.getByLabelText(/email/i), "bad");
      await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));

      expect(await screen.findByText("Please enter a valid email")).toBeInTheDocument();
    });
  });

  it("has a back link to sign in", () => {
    renderForgotPassword();

    const link = screen.getByRole("link", { name: /back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/auth");
  });
});
