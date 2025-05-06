
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { validateTenant, loginUser } from "@/api/authService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TenantLoginProps {
  initialSlug?: string;
}

const TenantLogin: React.FC<TenantLoginProps> = ({ initialSlug = "" }) => {
  const [step, setStep] = useState(initialSlug ? 1 : 0);
  const [tenantSlug, setTenantSlug] = useState(initialSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, setTenantSlug: updateTenantSlug } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tenant ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const isValid = await validateTenant(tenantSlug);
    setIsLoading(false);

    if (isValid) {
      updateTenantSlug(tenantSlug);
      setStep(1);
    } else {
      toast({
        title: "Invalid Tenant",
        description: "The tenant ID you entered is not valid",
        variant: "destructive",
      });
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const response = await loginUser(email, password, tenantSlug);
    setIsLoading(false);

    if (response.success && response.user) {
      login(response.user);
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      navigate("/dashboard");
    } else {
      toast({
        title: "Login Failed",
        description: response.message || "An error occurred during login",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-nepali-maroon">
          {step === 0 ? "Enter Tenant ID" : "Login to Your Account"}
        </CardTitle>
        <CardDescription className="text-center">
          {step === 0 
            ? "Please enter your organization's tenant ID" 
            : `Login to ${tenantSlug}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 0 ? (
          <form onSubmit={handleTenantSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Tenant ID"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full nepali-gradient text-white"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full nepali-gradient text-white"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {step === 1 && (
          <Button 
            variant="link" 
            onClick={() => setStep(0)}
            className="text-nepali-blue"
          >
            Change Tenant
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default TenantLogin;
