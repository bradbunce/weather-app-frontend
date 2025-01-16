import React, { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { updatePassword } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("Passwords do not match");
    }
    
    if (passwordRef.current.value.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    try {
      setMessage("");
      setError("");
      setLoading(true);
      await updatePassword(passwordRef.current.value);
      setMessage("Password updated successfully");
      passwordRef.current.value = "";
      passwordConfirmRef.current.value = "";
    } catch (error) {
      setError("Failed to update password: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-center mb-4">Update Password</h2>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {message && (
              <Alert className="mb-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  ref={passwordRef}
                  required
                  placeholder="Enter new password"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="password-confirm" className="block text-sm font-medium mb-1">
                  Confirm New Password
                </label>
                <input
                  id="password-confirm"
                  type="password"
                  ref={passwordConfirmRef}
                  required
                  placeholder="Confirm new password"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <Button 
                disabled={loading}
                type="submit"
                className="w-full"
              >
                Update Password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}