"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Plus, Heart, Calendar, Users } from "lucide-react";

export default function Home() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName="Sarah" />

      <div className="flex flex-1">
        <Sidebar
          eventName="Sarah & James"
          eventDate="September 14, 2026"
          activeItem="Overview"
        />

        <main className="flex-1 p-8">
          {/* Welcome section */}
          <div className="mb-8">
            <h1 className="text-3xl mb-2">Welcome back, Sarah</h1>
            <p className="text-warm-gray-400 text-sm">
              Your wedding is in <span className="text-rose-400 font-medium">168 days</span>. Let&apos;s make sure every seat is perfect.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <Card hover>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                  <Users size={18} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-2xl font-serif font-semibold text-warm-gray-800">124</p>
                  <p className="text-xs text-warm-gray-400">Total Guests</p>
                </div>
              </div>
            </Card>

            <Card hover>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gold-300/20 flex items-center justify-center">
                  <Calendar size={18} className="text-gold-500" />
                </div>
                <div>
                  <p className="text-2xl font-serif font-semibold text-warm-gray-800">12</p>
                  <p className="text-xs text-warm-gray-400">Tables Set Up</p>
                </div>
              </div>
            </Card>

            <Card hover>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                  <Heart size={18} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-2xl font-serif font-semibold text-warm-gray-800">98%</p>
                  <p className="text-xs text-warm-gray-400">Guests Seated</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Component showcase */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" icon={<Plus size={16} />}>
                Add Guest
              </Button>
              <Button variant="secondary">
                View Seating Chart
              </Button>
              <Button variant="gold" icon={<Heart size={16} />}>
                Export PDF
              </Button>
              <Button variant="ghost" onClick={() => setModalOpen(true)}>
                Open Modal Demo
              </Button>
            </div>
          </Card>

          {/* Form showcase */}
          <Card>
            <CardHeader>
              <CardTitle>Add a Guest</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <Input label="First Name" placeholder="e.g. Emily" />
              <Input label="Last Name" placeholder="e.g. Chen" />
              <Input
                label="Email"
                type="email"
                placeholder="emily@example.com"
                hint="We'll send them the invitation"
              />
              <Input
                label="Dietary Restrictions"
                placeholder="e.g. Vegetarian"
                error="This field has an error"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="primary">Save Guest</Button>
              <Button variant="ghost">Cancel</Button>
            </div>
          </Card>

          {/* Modal */}
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirm Assignment"
            size="sm"
          >
            <p className="text-sm text-warm-gray-600 mb-4">
              Are you sure you want to assign Emily Chen to Table 5? This will place her next to James Chen.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}
