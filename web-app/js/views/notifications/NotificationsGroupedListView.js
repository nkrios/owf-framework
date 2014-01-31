    ;(function(Backbone, _, Ozone) {
    'use strict';

    var Superclass = Ozone.views.BaseView;

    var headerHtml = '<h3 class="notification-list-header">Notifications</h3>';

    var NotificationsGroupedListView = Superclass.extend(_.extend({},
            Ozone.views.PopoverViewMixin, {

        className: 'notifications-grouped-list',

        //map from message sourceURL to UI section
        sections: {},

        //map from sourceURL to collection
        collections: {},

        modelEvents: {
            'add': 'addToSection',
            'remove': 'removeFromSection'
        },

        popoverConfig: {
            placement: 'bottom'
        },

        initialize: function(options) {
            Superclass.prototype.initialize.apply(this, arguments);
            Ozone.views.PopoverViewMixin.initialize.call(this, {
                parentEl: options.parentEl,
                preventClickClose: true
            });
        },

        render: function() {
            this.$el.append(headerHtml);
            this.renderSections();

            Ozone.views.PopoverViewMixin.render.apply(this, arguments);
            return this;
        },

        renderSections: function() {
            var sourceWidgets = _.unique(this.collection.map(function(model) {
                    return model.get('sourceWidget');
                })),
                //NOTE This only works assuming that the sourceURL === the sourceWidget's url
                groupedWidgets = this.collection.groupBy('sourceURL'),
                me = this;



            _.each(sourceWidgets, function(widget) {
                var url = widget ? widget.get('url') : null;

                if (me.sections[url]) {
                    throw new Error("Duplicate sections being created");
                }

                me.makeSection(widget, new Backbone.Collection(groupedWidgets[url]));
            });
        },

        addToSection: function(model) {
            var sourceWidget = model.get('sourceWidget'),
                url = sourceWidget ? sourceWidget.get('url') : null,
                section = this.sections[url] || this.makeSection(sourceWidget);

            section.collection.add(model);
        },

        removeFromSection: function(model) {
            var url = model.get('sourceURL'),
                section = this.sections[url];

            if (section) {
                section.collection.remove(model);

                /*
                 * normally this would happen automatically, but
                 * it turns out that backbone prevents remove events for models that
                 * are owned by a different collection from having any effect, so the remove
                 * listener in the section does not get called
                 */
                section.removeOne(model);

                if (section.collection.isEmpty()) {
                    delete this.sections[url];
                    section.remove();
                }
            }
        },

        dismissAll: function() {
            _.each(this.sections, function(section) {
                section.collection.reset();
            });

            this.collection.reset();
        },

        /**
         * Create a section for the given source URL, with the given optional starting collection
         */
        makeSection: function(sourceWidget, collection) {
            if (!sourceWidget) sourceWidget = new Backbone.Model({
                url: null,
                originalName: 'Unknown',
                headerIcon: ''
            });

            var section = new Ozone.views.notifications.NotificationsGroupView({
                sourceWidgetModel: sourceWidget,
                collection: collection || new Backbone.Collection()
            });

            this.$el.append(section.render().$el);
            this.sections[sourceWidget.get('url')] = section;

            return section;
        },

        //to deal with popover issues, remove and re-add events on hide-show
        hide: function() {
            Ozone.views.PopoverViewMixin.hide.apply(this, arguments);

            _.each(this.sections, function(section) {
                section.recursiveUndelegateEvents();
            });
        },

        show: function() {
            Ozone.views.PopoverViewMixin.show.apply(this, arguments);

            _.each(this.sections, function(section) {
                section.delegateEvents();
                section.recursiveDelegateEvents();
            });
        }
    }));

    $.extend(true, Ozone, { views: { notifications: {
        NotificationsGroupedListView: NotificationsGroupedListView}}});
})(window.Backbone, window._, window.Ozone);